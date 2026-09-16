"""
Abhishek Maurya — personal portfolio.

A small Flask app: one page, one story. All content lives in CONTENT so the
template stays structural and the copy stays editable in one place.
"""

from flask import Flask, render_template, send_from_directory, abort
import os

app = Flask(__name__)

# Swap this if you replace the portrait. Anything with a transparent
# background works best for the particle formation in the intro.
PROFILE_IMAGE = "images/profile.webp"

CONTENT = {
    "name": "Abhishek Maurya",
    "initials": "AM",
    "role": "B.Tech CSE (AI) | Developer | AI Enthusiast | Problem Solver",
    "brand": "Turning Ideas Into Impact",
    "mantra": ["Ideas", "Code", "Impact"],
    "description": "I build practical solutions with AI, web technologies and a real-world mindset.",
    "location": "Lucknow, Uttar Pradesh",
    "education": "B.Tech CSE (AI) — BIET Lucknow (AKTU)",
    "email": "abhishek@example.com",
    "socials": [
        {"label": "GitHub", "icon": "github", "url": "https://github.com/"},
        {"label": "LinkedIn", "icon": "linkedin", "url": "https://linkedin.com/in/"},
        {"label": "YouTube", "icon": "youtube", "url": "https://youtube.com/"},
        {"label": "X", "icon": "twitter", "url": "https://x.com/"},
        {"label": "Email", "icon": "mail", "url": "mailto:abhishek@example.com"},
    ],
    "nav": ["Home", "About", "Skills", "Projects", "Experience", "Contact"],
    "about": {
        "paragraphs": [
            "I'm a B.Tech student in Computer Science (AI) at Bansal Institute of "
            "Engineering and Technology, Lucknow.",
            "I'm passionate about Artificial Intelligence, Web Development and building "
            "useful products that solve real-world problems.",
        ],
        "interests": ["AI", "Web Development", "Open Source", "Startups"],
        "stats": [
            {"value": 10, "suffix": "+", "label": "Projects Built"},
            {"value": 2, "suffix": "+", "label": "Years Learning"},
            {"value": 6, "suffix": "+", "label": "Technologies"},
            {"value": None, "symbol": "∞", "label": "Always Growing"},
        ],
    },
    # Grouped so the skills section reads as a stack, not a random wall of pills.
    "skills": [
        {
            "group": "Languages",
            "tech": [
                {"name": "Python", "icon": "terminal"},
                {"name": "Java", "icon": "coffee"},
                {"name": "C++", "icon": "braces"},
                {"name": "JavaScript", "icon": "code-2"},
            ],
        },
        {
            "group": "Web & Frameworks",
            "tech": [
                {"name": "React", "icon": "atom"},
                {"name": "Tailwind CSS", "icon": "wind"},
                {"name": "Django", "icon": "layers"},
                {"name": "FastAPI", "icon": "zap"},
                {"name": "Node.js", "icon": "hexagon"},
                {"name": "Streamlit", "icon": "layout-dashboard"},
            ],
        },
        {
            "group": "AI & Data",
            "tech": [
                {"name": "OpenAI", "icon": "sparkles"},
                {"name": "Ollama", "icon": "brain"},
                {"name": "PostgreSQL", "icon": "database"},
                {"name": "MongoDB", "icon": "leaf"},
            ],
        },
        {
            "group": "Systems & Tooling",
            "tech": [
                {"name": "Docker", "icon": "container"},
                {"name": "Kafka", "icon": "git-compare"},
                {"name": "RabbitMQ", "icon": "rabbit"},
                {"name": "Linux", "icon": "monitor"},
                {"name": "Git", "icon": "git-branch"},
                {"name": "GitHub", "icon": "github"},
                {"name": "VS Code", "icon": "file-code-2"},
            ],
        },
    ],
    "projects": [
        {
            "name": "FactCheckAI",
            "tagline": "AI-powered fake news detector with source verification.",
            "detail": "Claims are checked against live news sources, then a local model "
                      "explains why a story holds up or falls apart.",
            "tech": ["Flask", "Ollama", "Python", "News APIs", "BeautifulSoup"],
            "url": "#",
        },
        {
            "name": "UCRP",
            "tagline": "Unified AI Complaint Routing Platform for UP & Delhi.",
            "detail": "Citizen complaints are classified, deduplicated and routed to the "
                      "right department instead of sitting in a generic inbox.",
            "tech": ["FastAPI", "OpenAI", "PostgreSQL", "AI"],
            "url": "#",
        },
        {
            "name": "Know Your Gov",
            "tagline": "Public information platform for government information.",
            "detail": "Scattered schemes, offices and contacts pulled into one searchable "
                      "place, in language people actually use.",
            "tech": ["React", "FastAPI", "PostgreSQL", "BeautifulSoup"],
            "url": "#",
        },
        {
            "name": "Event Management System",
            "tagline": "Full-stack event management platform.",
            "detail": "Registration, ticketing and payments end to end, with an organiser "
                      "dashboard for live attendance.",
            "tech": ["React", "Node.js", "MongoDB", "Razorpay", "Tailwind"],
            "url": "#",
        },
    ],
    "journey": [
        {
            "period": "2023 — 2027",
            "title": "B.Tech CSE (AI)",
            "org": "BIET Lucknow (AKTU)",
            "kind": "Education",
            "detail": "Computer Science with an Artificial Intelligence specialisation.",
        },
        {
            "period": "2026",
            "title": "PBEL Internship Program",
            "org": "Machine Learning",
            "kind": "Experience",
            "detail": "Worked on fake news detection using machine learning — dataset "
                      "preparation, model training and evaluation.",
        },
    ],
    "contact": {
        "heading": "Let's Build Something Meaningful.",
        "description": "I'm always open to discussing new opportunities, interesting "
                       "projects, or just tech and ideas.",
        "cta": "Send a Message",
    },
}


@app.route("/")
def index():
    return render_template("index.html", c=CONTENT, profile=PROFILE_IMAGE)


@app.route("/resume")
def resume():
    """Serves static/files/resume.pdf when you drop one in."""
    path = os.path.join(app.static_folder, "files")
    if not os.path.exists(os.path.join(path, "resume.pdf")):
        abort(404)
    return send_from_directory(path, "resume.pdf", as_attachment=True)


@app.after_request
def add_header(response):
    if app.debug:
        response.headers["Cache-Control"] = "no-store"
    return response


if __name__ == "__main__":
    app.run(debug=True, port=5001)
