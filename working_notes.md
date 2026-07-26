# Working Notes: Fencing & Karate Master Project

## Project Overview
- **Location**: `/Users/ken/dev/fencing-master`
- **Aim**: A workspace for testing apps, utilities, and sensor analysis tools designed to assist in Fencing and Karate training.
- **Top-Level Layout**: Subdirectories for specific projects/apps (`apps/footwork-mirror`, etc.), leaving root clean with overall documentation (`README.md`, `working_notes.md`).

---

## Task Log & Milestones

### 2026-07-26 - Initial Setup & Footwork Mirror App Design
- **Goal**:
  1. Add top-level `README.md` explaining workspace organization and aim.
  2. Plan & implement `apps/footwork-mirror` Android application (Phone app for wall display + Wear OS app for Pixel Watch sensor detection).

- **Key Requirements for Footwork Mirror App**:
  - **Phone Display (Pixel Phone on Wall)**:
    - Big high-contrast symbols, bold text, and background color coding for visual visibility from a distance.
    - Random cue intervals (configurable min/max timings e.g. 2s - 5s).
    - Presets for Karate (Forward, Backward, Gyaku-zuki, Oi-zuki) and Fencing (Advance, Retreat, Lunge, Step-Lunge).
    - Displays live reaction time ($t_{\text{strike}} - t_{\text{cue}}$) and summary stats.
    - Sound callouts / tone signals (optional/toggleable).
  - **Wear OS Companion (Pixel Watch on Wrist)**:
    - Worn on student's strike/sword arm.
    - Monitors `Sensor.TYPE_LINEAR_ACCELERATION`.
    - Detects attack initiation (passes high acceleration threshold $T_{high}$) and recovery/recoil (drops below low threshold $T_{low}$).
    - Sends reaction timing and strike payload back to Phone via Wearable Data Layer (`MessageClient`).
    - Fallback: Phone screen tap / simulator button on phone for testing without watch.

- **Architecture Exploration - Camera Web App Pivot**:
  - Evaluated feasibility of a Camera-based Web Application (WebRTC Camera + MediaPipe Pose / TensorFlow.js).
  - **Verdict: Highly Feasible and Advantageous!**
    - **No wearable device required**: Runs in any browser on laptop, tablet, or phone.
    - **Full-body tracking**: MediaPipe Pose tracks 33 3D body landmarks at 30-60 FPS locally in browser.
    - **Direction & Strike Verification**: Can detect both wrist velocity/extension (for lunges/punches) AND hip/foot displacement (verifying advance vs retreat).
    - **Reaction Timing**: Camera frame timestamps provide ~16-33ms precision for reaction measurement ($t_{\text{pose\_movement}} - t_{\text{cue}}$).
    - **Z-depth Tracking Analysis**: Leveraging MediaPipe 3D landmarks allows for "depth-first" analysis. By monitoring the Z-axis coordinate of the wrist relative to the shoulder, we can calculate true extension velocity, effectively filtering out lateral noise and focusing purely on the reach/strike movement.
  - **Proposed Technology Stack for Web App**:
    - HTML5, CSS (Dark mode, high visibility glassmorphism, bold callout design system), JavaScript/TypeScript.
    - `@mediapipe/pose` or `@tensorflow-models/pose-detection` running on WebGL / WebGPU.
    - Web Audio API for sound callouts and high-precision timing benchmarks.

- **Architecture Plan**:
  - **Root Gradle Project**: `apps/footwork-mirror`
  - **Modules**:
    - `:mobile` - Android Phone App (Jetpack Compose UI, Drill Controller, Wearable Receiver).
    - `:wear` - Wear OS App (SensorEventListener, Attack Detector, Wearable Sender).
    - `:shared` - Shared Kotlin data models & Wearable Message paths (`/start_drill`, `/stop_drill`, `/cue_change`, `/strike_detected`).
  - **Demo Build Plan (Web Prototype)**:
    - Phase 1: Built standalone HTML5/CSS3/JS Web Application in `apps/footwork-mirror-web`.
    - Phase 2: Implemented multi-vector Z-depth & extension tracking engine:
      - 3D Joint extension angle ($\angle \text{Shoulder-Elbow-Wrist}$) from 90° guard to 170° strike.
      - Relative $Z$-depth velocity ($\Delta Z_{\text{wrist}} / \Delta t$) leveraging MediaPipe 3D coordinates.
      - Hand 2D bounding scale rate ($\Delta D_{\text{wrist-index}} / \Delta t$).
    - Phase 3: Distance-visible wall display UI with Karate & Fencing presets, audio callouts, reaction timing ($t_{\text{strike}} - t_{\text{cue}}$), and real-time motion meters.
    - Phase 4: Local dev server running for live browser testing.

---

## Status & Next Steps
- [x] Workspace structure and top-level `README.md` established.
- [x] Initialized and updated `working_notes.md`.
- [x] Created `apps/footwork-mirror-web` interactive camera demo with MediaPipe Pose 3D Z-depth strike detection.
- [x] Refined timing & UI based on user feedback:
  1. Auto-dismiss forward/back step commands after 1s to minimal black neutral state, enabling distinct repeated step cues.
  2. Immediate dismissal of red attack background on strike detection, displaying reaction time badge (`⚡ XXX ms`) for 1.2s before auto-hiding back to the minimal black neutral screen.
  3. Attack Cue Probabilities & Weighting:
     - Overall attack frequency set to ~30% of total commands.
     - **Attack Weighting**: Direct attacks (**Lunge** / **逆突き**) make up **~75%** of attack calls; combination step attacks (**Step-Lunge** / **追い突き**) are rarer at **~25%** of attack calls.
  4. Fixed Camera Freeze Bug (Callback Exception Guarding):
     - **Root Cause**: Unhandled exception in pose callback caused MediaPipe CameraUtils `onFrame` async loop to freeze after frame 1.
     - **Solution**: Wrapped `onPoseResults` and `analyzeStrikePose` in safe `try { ... } catch (err)` blocks with null-checks on all DOM elements and landmark arrays, guaranteeing the camera tracking loop never freezes.
  5. Minimal black neutral screen: removed all icons, text, and reaction badges during En Garde resting state to eliminate distractions.
  6. Terminology:
     - **Karate**: **前** (Mae), **後** (Ushiro), **逆突き** (Gyaku-zuki), **追い突き** (Oi-zuki), **構え** (Kamae).
     - **Fencing**: **Advance**, **Retreat**, **Lunge**, **Step-Lunge**, **En Garde**.
- [x] Launched local preview server for user testing (`http://localhost:3333`).
- [ ] Await user verification of updated drill timing and attack registration feedback.
