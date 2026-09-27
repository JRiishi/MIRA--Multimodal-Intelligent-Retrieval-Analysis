import re
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.project import ProjectDB
from app.models.media import VisualEvidenceDB
from app.models.chat import ChatMessageDB
from app.schemas.chat import (
    ChatMessageResponse, 
    ChatEvidenceItem, 
    ProjectTimelineItem, 
    ProjectReportResponse
)
from app.services.project_context_service import ProjectContextService
from app.services.change_service import ChangeService


def classify_intent(message: str) -> str:
    """Classify the user query into a project intelligence workflow."""
    msg = message.lower().strip()
    
    # 1. Report Generation
    if any(k in msg for k in ["generate report", "create report", "impact report", "project report", "audit report", "generate an impact report", "report"]):
        return "REPORT"
        
    # 2. What Changed / Progression / Before After
    if any(k in msg for k in ["what changed", "how has the project progressed", "progression", "before and after", "before/after", "compare", "changes observed", "progressed", "change over time", "what was done", "what is new", "difference", "comparison", "changed"]):
        return "CHANGE"
        
    # 3. Current Status & Progress
    if any(k in msg for k in ["current status", "project status", "what is the status", "latest status", "where are we at", "status", "what is going on", "current stage", "is it done", "completed", "completion", "state", "current state", "condition", "how is it going", "progress"]):
        return "STATUS"
        
    # 4. Recent Activity
    if any(k in msg for k in ["recent activity", "what happened recently", "latest activity", "most recent", "latest updates", "recent work", "recent progress", "activities", "recently", "latest"]):
        return "RECENT_ACTIVITY"
        
    # 5. Timeline
    if any(k in msg for k in ["timeline", "chronology", "over time", "over the last", "history of activity", "date by date", "milestones", "history", "chronological"]):
        return "TIMELINE"
        
    # 6. Evidence Search
    if any(k in msg for k in ["show me evidence", "find visual evidence", "find evidence", "show evidence", "search for images", "find images", "show images", "evidence", "photos", "pictures", "image of", "photo of", "search for"]):
        return "EVIDENCE_SEARCH"
        
    # 7. Project Summary
    if any(k in msg for k in ["summarize this project", "project summary", "tell me about this project", "project overview", "what is this project", "summary", "overview", "about this project", "project info", "explain"]):
        return "SUMMARY"
        
    # 8. General Question
    return "GENERAL"


class ChatService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.context_service = ProjectContextService.get_instance()
        self.llm_model = None
        self.tokenizer = None
        self.model_loaded = False
        self._try_load_llm()

    def _try_load_llm(self):
        """Optional lightweight LLM loader if available."""
        try:
            # We keep model loading optional/lazy so tests and systems without GPU run instantly
            self.model_loaded = False
        except Exception as e:
            print(f"[CHAT] LLM initialization notice: {e}")
            self.model_loaded = False

    def handle_project_chat(
        self, 
        project_id: str, 
        message: str, 
        db: Session
    ) -> ChatMessageResponse:
        """
        Main orchestration for project-scoped AI chat.
        Ensures strict project isolation and evidence-backed reasoning.
        """
        project = self.context_service.get_project(project_id, db)
        if not project:
            return ChatMessageResponse(
                answer="Project not found in system records.",
                project_id=project_id,
                intent="ERROR",
                evidence=[]
            )

        intent = classify_intent(message)
        print(f"[CHAT] Scoped Project: '{project.name}' ({project_id}) | Intent: {intent} | Message: '{message}'")

        # Dispatch to specialized evidence workflows
        if intent == "STATUS":
            response = self._handle_status(project, db)
        elif intent == "RECENT_ACTIVITY":
            response = self._handle_recent_activity(project, db)
        elif intent == "EVIDENCE_SEARCH":
            response = self._handle_evidence_search(project, message, db)
        elif intent == "TIMELINE":
            response = self._handle_timeline(project, db)
        elif intent == "CHANGE":
            response = self._handle_change(project, db)
        elif intent == "SUMMARY":
            response = self._handle_summary(project, db)
        elif intent == "REPORT":
            report_data = self.generate_project_report(project_id, db)
            response = ChatMessageResponse(
                answer=self._format_report_answer(report_data),
                project_id=project_id,
                intent="REPORT",
                evidence=report_data.key_evidence
            )
        else:
            response = self._handle_general_query(project, message, db)

        # Persist conversation exchange to database
        self._save_chat_history(project_id, message, response, db)
        return response

    # -------------------------------------------------------------
    # WORKFLOW 1: STATUS
    # -------------------------------------------------------------
    def _handle_status(self, project: ProjectDB, db: Session) -> ChatMessageResponse:
        latest_ev = self.context_service.get_latest_evidence(project.id, db, limit=3)
        if not latest_ev:
            return ChatMessageResponse(
                answer="Insufficient visual evidence to determine the current status.",
                project_id=project.id,
                intent="STATUS",
                evidence=[]
            )

        top_ev = latest_ev[0]
        date_str = top_ev.timestamp or (top_ev.created_at.strftime("%B %d, %Y") if top_ev.created_at else "recent observation")
        
        answer_parts = [
            f"Based on the latest available visual evidence (recorded on {date_str}), the current observed activity in **{project.name}** is **{top_ev.activity or 'field work'}**."
        ]
        if top_ev.description:
            answer_parts.append(f"Visual Observation: {top_ev.description}")
        if top_ev.location:
            answer_parts.append(f"Location: {top_ev.location}.")

        evidence_items = [
            ChatEvidenceItem(
                asset_id=ev.asset_id,
                cloudinary_url=ev.cloudinary_url,
                description=ev.description or "",
                timestamp=ev.timestamp or (ev.created_at.isoformat() if ev.created_at else None),
                location=ev.location,
                activity=ev.activity,
                scene=ev.scene
            ) for ev in latest_ev
        ]

        return ChatMessageResponse(
            answer="\n\n".join(answer_parts),
            project_id=project.id,
            intent="STATUS",
            evidence=evidence_items
        )

    # -------------------------------------------------------------
    # WORKFLOW 2: RECENT ACTIVITY
    # -------------------------------------------------------------
    def _handle_recent_activity(self, project: ProjectDB, db: Session) -> ChatMessageResponse:
        recent_ev = self.context_service.get_latest_evidence(project.id, db, limit=5)
        if not recent_ev:
            return ChatMessageResponse(
                answer="No recent activities have been recorded for this project yet.",
                project_id=project.id,
                intent="RECENT_ACTIVITY",
                evidence=[]
            )

        lines = [f"The most recent activities observed in **{project.name}** include:"]
        for ev in recent_ev:
            d_str = ev.timestamp or (ev.created_at.strftime("%b %d, %Y") if ev.created_at else "Recent")
            lines.append(f"- **{d_str}**: {ev.activity or 'Activity'} — *{ev.description or 'Evidence recorded.'}*")

        evidence_items = [
            ChatEvidenceItem(
                asset_id=ev.asset_id,
                cloudinary_url=ev.cloudinary_url,
                description=ev.description or "",
                timestamp=ev.timestamp or (ev.created_at.isoformat() if ev.created_at else None),
                location=ev.location,
                activity=ev.activity,
                scene=ev.scene
            ) for ev in recent_ev
        ]

        return ChatMessageResponse(
            answer="\n".join(lines),
            project_id=project.id,
            intent="RECENT_ACTIVITY",
            evidence=evidence_items
        )

    # -------------------------------------------------------------
    # WORKFLOW 3: EVIDENCE SEARCH
    # -------------------------------------------------------------
    def _handle_evidence_search(self, project: ProjectDB, message: str, db: Session) -> ChatMessageResponse:
        # Extract search keywords / clean query
        cleaned_query = re.sub(
            r'(show me evidence of|find visual evidence related to|find evidence of|find images of|show images of|show evidence|find evidence|search for|images of|evidence related to)',
            '',
            message,
            flags=re.IGNORECASE
        ).strip()
        if not cleaned_query:
            cleaned_query = message

        results = self.context_service.search_project_evidence(
            project_id=project.id,
            query=cleaned_query,
            limit=4,
            min_score=0.30
        )

        if not results:
            return ChatMessageResponse(
                answer=f"Insufficient visual evidence found for \"{cleaned_query}\" in this project.",
                project_id=project.id,
                intent="EVIDENCE_SEARCH",
                evidence=[]
            )

        answer = f"Found **{len(results)}** relevant visual evidence item(s) related to **\"{cleaned_query}\"** in **{project.name}**:"
        return ChatMessageResponse(
            answer=answer,
            project_id=project.id,
            intent="EVIDENCE_SEARCH",
            evidence=results
        )

    # -------------------------------------------------------------
    # WORKFLOW 4: TIMELINE
    # -------------------------------------------------------------
    def _handle_timeline(self, project: ProjectDB, db: Session) -> ChatMessageResponse:
        timeline_items = self.context_service.get_timeline(project.id, db)
        if not timeline_items:
            return ChatMessageResponse(
                answer="No chronological timeline records exist for this project yet.",
                project_id=project.id,
                intent="TIMELINE",
                evidence=[]
            )

        lines = [f"### Project Activity Timeline for {project.name}\n"]
        for item in timeline_items:
            lines.append(f"- **{item.date}** — **{item.activity}**\n  {item.description}")

        evidence_items = [
            ChatEvidenceItem(
                asset_id=item.asset_id or "",
                cloudinary_url=item.cloudinary_url,
                description=item.description or "",
                timestamp=item.date,
                location=item.location,
                activity=item.activity,
                scene=item.scene
            ) for item in timeline_items
        ]

        return ChatMessageResponse(
            answer="\n".join(lines),
            project_id=project.id,
            intent="TIMELINE",
            evidence=evidence_items
        )

    # -------------------------------------------------------------
    # WORKFLOW 5: WHAT CHANGED / PROGRESSION
    # -------------------------------------------------------------
    def _handle_change(self, project: ProjectDB, db: Session) -> ChatMessageResponse:
        earliest, latest = self.context_service.get_earliest_and_latest(project.id, db)
        if not earliest or not latest:
            return ChatMessageResponse(
                answer="Insufficient evidence to evaluate project changes.",
                project_id=project.id,
                intent="CHANGE",
                evidence=[]
            )

        if earliest.id == latest.id:
            return ChatMessageResponse(
                answer=f"Currently, only a single evidence record exists for **{project.name}** (Activity: *{latest.activity}* on {latest.timestamp or 'initial date'}). Additional sequential uploads will enable automated before/after structural change detection.",
                project_id=project.id,
                intent="CHANGE",
                evidence=[
                    ChatEvidenceItem(
                        asset_id=latest.asset_id,
                        cloudinary_url=latest.cloudinary_url,
                        description=latest.description or "",
                        timestamp=latest.timestamp,
                        location=latest.location,
                        activity=latest.activity
                    )
                ]
            )

        # Run SSIM structural comparison
        change_res = ChangeService.analyze_change(earliest.cloudinary_url, latest.cloudinary_url)
        d_early = earliest.timestamp or (earliest.created_at.strftime("%b %d, %Y") if earliest.created_at else "Initial Stage")
        d_late = latest.timestamp or (latest.created_at.strftime("%b %d, %Y") if latest.created_at else "Current Stage")

        score_pct = int((1.0 - change_res["change_score"]) * 100) if change_res.get("change_score") is not None else 0

        answer = (
            f"### Observed Progression & Structural Change\n\n"
            f"Comparing the initial baseline on **{d_early}** against the latest observation on **{d_late}**:\n\n"
            f"- **Initial Baseline ({d_early})**: Observed *{earliest.activity}* - {earliest.description}\n"
            f"- **Latest State ({d_late})**: Observed *{latest.activity}* - {latest.description}\n\n"
            f"**Analysis Summary**: {change_res.get('summary', 'Structural progression observed.')} "
            f"(Computed Visual Variation: ~{score_pct}%)."
        )

        evidence_items = [
            ChatEvidenceItem(
                asset_id=earliest.asset_id,
                cloudinary_url=earliest.cloudinary_url,
                description=f"[BEFORE - {d_early}] {earliest.description or ''}",
                timestamp=d_early,
                location=earliest.location,
                activity=earliest.activity
            ),
            ChatEvidenceItem(
                asset_id=latest.asset_id,
                cloudinary_url=latest.cloudinary_url,
                description=f"[AFTER - {d_late}] {latest.description or ''}",
                timestamp=d_late,
                location=latest.location,
                activity=latest.activity
            )
        ]

        return ChatMessageResponse(
            answer=answer,
            project_id=project.id,
            intent="CHANGE",
            evidence=evidence_items
        )

    # -------------------------------------------------------------
    # WORKFLOW 6: SUMMARY
    # -------------------------------------------------------------
    def _handle_summary(self, project: ProjectDB, db: Session) -> ChatMessageResponse:
        all_ev = self.context_service.get_all_project_evidence(project.id, db)
        desc = project.description or "No formal description registered."
        loc = f" situated in **{project.location_name}**" if project.location_name else ""

        if not all_ev:
            return ChatMessageResponse(
                answer=f"**{project.name}**{loc} is currently registered with description: *{desc}*. No field visual evidence has been routed to this project yet.",
                project_id=project.id,
                intent="SUMMARY",
                evidence=[]
            )

        activities = list(dict.fromkeys([e.activity for e in all_ev if e.activity]))
        act_summary = ", ".join(activities) if activities else "General field work"

        answer = (
            f"### Project Overview: {project.name}\n\n"
            f"- **Location**: {project.location_name or 'Unspecified'}\n"
            f"- **Description**: {desc}\n"
            f"- **Evidence Records**: {len(all_ev)} verified multimodal asset(s)\n"
            f"- **Observed Activities**: {act_summary}\n\n"
            f"The latest record indicates ongoing work on **{all_ev[-1].activity or 'activity'}**."
        )

        evidence_items = [
            ChatEvidenceItem(
                asset_id=ev.asset_id,
                cloudinary_url=ev.cloudinary_url,
                description=ev.description or "",
                timestamp=ev.timestamp or (ev.created_at.isoformat() if ev.created_at else None),
                location=ev.location,
                activity=ev.activity
            ) for ev in all_ev[:4]
        ]

        return ChatMessageResponse(
            answer=answer,
            project_id=project.id,
            intent="SUMMARY",
            evidence=evidence_items
        )

    # -------------------------------------------------------------
    # WORKFLOW 7: GENERAL QUERY (Project-Scoped Semantic RAG)
    # -------------------------------------------------------------
    def _handle_general_query(self, project: ProjectDB, message: str, db: Session) -> ChatMessageResponse:
        results = self.context_service.search_project_evidence(
            project_id=project.id,
            query=message,
            limit=4,
            min_score=0.20
        )

        all_ev = self.context_service.get_all_project_evidence(project.id, db)
        if not all_ev:
            return ChatMessageResponse(
                answer=f"No photographic evidence has been uploaded to **{project.name}** yet. Upload field photos to populate visual evidence and enable automated AI reasoning.",
                project_id=project.id,
                intent="GENERAL",
                evidence=[]
            )

        if not results:
            # When semantic search doesn't find a direct query hit, provide a grounded synthesis of available evidence
            latest = all_ev[-1]
            d_str = latest.timestamp or (latest.created_at.strftime("%B %d, %Y") if latest.created_at else "recent observation")
            activities = list(dict.fromkeys([e.activity for e in all_ev if e.activity]))
            act_str = ", ".join(activities) if activities else "field operations"

            answer = (
                f"In **{project.name}**, {len(all_ev)} visual evidence record(s) are documented. "
                f"The latest field observation (recorded on {d_str}) shows: **{latest.description}** "
                f"(Activity: *{latest.activity or 'Ongoing work'}*). "
                f"Overall recorded project activities include: *{act_str}*."
            )
            results = [
                ChatEvidenceItem(
                    asset_id=ev.asset_id,
                    cloudinary_url=ev.cloudinary_url,
                    description=ev.description or "",
                    timestamp=ev.timestamp or (ev.created_at.isoformat() if ev.created_at else None),
                    location=ev.location,
                    activity=ev.activity,
                    scene=ev.scene
                ) for ev in (all_ev[-2:] if len(all_ev) > 1 else all_ev)
            ]
        else:
            top_item = results[0]
            date_str = top_item.timestamp or "recent evidence"
            answer = (
                f"Regarding your query in **{project.name}**, the recorded visual evidence from **{date_str}** shows: "
                f"**{top_item.description}** (Activity: *{top_item.activity or 'Observed work'}*)."
            )

        return ChatMessageResponse(
            answer=answer,
            project_id=project.id,
            intent="GENERAL",
            evidence=results
        )

    # -------------------------------------------------------------
    # REPORT GENERATOR
    # -------------------------------------------------------------
    def generate_project_report(self, project_id: str, db: Session) -> ProjectReportResponse:
        """Generate structured project impact report."""
        project = self.context_service.get_project(project_id, db)
        if not project:
            raise ValueError(f"Project with ID {project_id} not found.")

        all_ev = self.context_service.get_all_project_evidence(project_id, db)
        timeline = self.context_service.get_timeline(project_id, db)
        earliest, latest = self.context_service.get_earliest_and_latest(project_id, db)

        current_status = "No evidence recorded yet."
        recent_activity = "None"
        if latest:
            d_str = latest.timestamp or (latest.created_at.strftime("%B %d, %Y") if latest.created_at else "Recent")
            current_status = f"Active — observed '{latest.activity or 'field work'}' on {d_str} ({latest.description or ''})"
            recent_activity = latest.activity or "Field work"

        before_summary = None
        before_url = None
        after_url = None
        change_score = None

        if earliest and latest and earliest.id != latest.id:
            change_res = ChangeService.analyze_change(earliest.cloudinary_url, latest.cloudinary_url)
            before_summary = change_res.get("summary", "Structural change detected.")
            before_url = earliest.cloudinary_url
            after_url = latest.cloudinary_url
            change_score = change_res.get("change_score")

        key_evidence = [
            ChatEvidenceItem(
                asset_id=ev.asset_id,
                cloudinary_url=ev.cloudinary_url,
                description=ev.description or "",
                timestamp=ev.timestamp or (ev.created_at.isoformat() if ev.created_at else None),
                location=ev.location,
                activity=ev.activity,
                scene=ev.scene
            ) for ev in all_ev[:6]
        ]

        return ProjectReportResponse(
            project_id=project.id,
            project_name=project.name,
            project_description=project.description,
            location_name=project.location_name,
            total_evidence_count=len(all_ev),
            current_status=current_status,
            recent_activity=recent_activity,
            timeline_summary=timeline,
            key_evidence=key_evidence,
            before_after_summary=before_summary,
            before_asset_url=before_url,
            after_asset_url=after_url,
            change_score=change_score,
            generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        )

    def _format_report_answer(self, report: ProjectReportResponse) -> str:
        lines = [
            f"# PROJECT IMPACT & INTELLIGENCE REPORT",
            f"**Project**: {report.project_name}",
            f"**Location**: {report.location_name or 'Unspecified'}",
            f"**Generated**: {report.generated_at}",
            f"**Total Visual Evidence**: {report.total_evidence_count} verified records\n",
            f"### CURRENT STATUS",
            f"{report.current_status}\n",
            f"### RECENT ACTIVITY",
            f"Observed Activity: **{report.recent_activity}**\n",
            f"### TIMELINE MILESTONES",
        ]
        if report.timeline_summary:
            for item in report.timeline_summary:
                lines.append(f"- **{item.date}**: {item.activity} — *{item.description}*")
        else:
            lines.append("No historical timeline records available.")

        if report.before_after_summary:
            lines.append(f"\n### BEFORE & AFTER PROGRESSION")
            lines.append(f"{report.before_after_summary}")

        lines.append(f"\n### KEY EVIDENCE REFERENCES")
        lines.append(f"Structured image records attached below for audit traceability.")

        return "\n".join(lines)

    # -------------------------------------------------------------
    # CHAT HISTORY PERSISTENCE
    # -------------------------------------------------------------
    def _save_chat_history(
        self, 
        project_id: str, 
        user_message: str, 
        assistant_resp: ChatMessageResponse, 
        db: Session
    ):
        try:
            user_msg_db = ChatMessageDB(
                project_id=project_id,
                role="user",
                message=user_message,
                intent=assistant_resp.intent,
                evidence=None
            )
            db.add(user_msg_db)

            ev_json = json.dumps([e.model_dump() for e in assistant_resp.evidence]) if assistant_resp.evidence else None
            asst_msg_db = ChatMessageDB(
                project_id=project_id,
                role="assistant",
                message=assistant_resp.answer,
                intent=assistant_resp.intent,
                evidence=ev_json
            )
            db.add(asst_msg_db)
            db.commit()
        except Exception as e:
            print(f"[CHAT] Warning: Could not persist chat message to DB: {e}")
            db.rollback()

    def get_chat_history(self, project_id: str, db: Session) -> List[Dict[str, Any]]:
        """Fetch project-isolated conversation history."""
        messages = (
            db.query(ChatMessageDB)
            .filter(ChatMessageDB.project_id == project_id)
            .order_by(ChatMessageDB.created_at.asc())
            .all()
        )
        history = []
        for m in messages:
            ev_list = []
            if m.evidence:
                try:
                    ev_list = json.loads(m.evidence)
                except Exception:
                    ev_list = []
            history.append({
                "id": m.id,
                "role": m.role,
                "message": m.message,
                "intent": m.intent,
                "evidence": ev_list,
                "created_at": m.created_at.isoformat() if m.created_at else None
            })
        return history

    def clear_chat_history(self, project_id: str, db: Session) -> bool:
        """Clear conversation history for this project workspace."""
        db.query(ChatMessageDB).filter(ChatMessageDB.project_id == project_id).delete()
        db.commit()
        return True
