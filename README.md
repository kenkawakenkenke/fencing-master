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
    └── footwork-mirror-web/      # Camera-based AI Mirror Footwork & Strike Trainer
```

---

## Projects & Applications

### 1. Footwork Mirror Web (`apps/footwork-mirror-web`)
An AI-powered web training application for interactive mirror footwork and strike reaction training using front-facing camera pose estimation.

* **Wall / Table Display (Laptop, Tablet, or Smartphone)**: Displays high-contrast, distance-visible movement cues (Advance/Retreat, Lunge, Gyaku-zuki, Oi-zuki, etc.) at random intervals.
* **3D Motion & Z-Depth Reaction Engine (MediaPipe Pose)**: Tracks 33 3D body landmarks at 30–60 FPS directly in the browser to measure strike reaction time and verify footwork movement without requiring any smartwatch or wearable sensors.

---

## Getting Started
Refer to the individual project directories inside `apps/` for build instructions, dependencies, and setup details.
