# Fencing & Martial Arts Training Workspace

## Project Aim
This repository serves as a centralized testing ground and development hub for software applications, hardware sensor experiments, and data analysis tools aimed at enhancing training in **Fencing** and **Karate** (and other martial arts). 

The goal is to leverage modern mobile devices, smartwatches, computer vision, and wearable motion sensors to assist athletes and coaches with:
- Footwork drills & reaction timing ("mirror training").
- Motion & acceleration analysis for strikes, lunges, and defensive maneuvers.
- Interactive training tools designed for solo practice and automated coaching.

---

## Repository Structure
To keep individual tools modular and maintainable, top-level directories are reserved for project-wide documentation and configuration. All sub-projects, mobile applications, and analysis scripts reside in designated subdirectories:

```
.
├── README.md                      # Workspace documentation (this file)
├── working_notes.md              # Active development context and engineering log
└── apps/                         # Standalone applications & tools
    └── footwork-mirror/          # Android App & Wear OS companion for mirror drills
```

---

## Projects & Applications

### 1. Footwork Mirror (`apps/footwork-mirror`)
An Android phone + Wear OS (Pixel Watch) training application for interactive mirror footwork and strike reaction training.

* **Wall Phone Display (Pixel Phone)**: Displays high-contrast movement cues (Advance/Retreat, Lunge, Gyaku-zuki, etc.) at random intervals.
* **Wrist Wear OS Companion (Pixel Watch)**: Worn on the martial artist's wrist/arm. Uses linear acceleration sensor telemetry to automatically detect strikes/lunges, recording precise reaction time and stroke completion duration.

---

## Getting Started
Refer to the individual project directories inside `apps/` for build instructions, dependencies, and setup details.
