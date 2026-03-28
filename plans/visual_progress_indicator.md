# Visual Progress Indicator Implementation Plan

## Objective
Add a visual progress indicator to the PomoFocus timer to allow users to gauge the remaining session time at a glance without reading the numeric display. This directly improves the user experience by reducing cognitive load during focus sessions.

## Implementation Details

### 1. UI Changes (`app/home/index.html` & `app/home/style.css`)
- Wrap the existing `#timer` element and `#alarm-indicator` inside a new flex container.
- Introduce an SVG graphic behind the timer text. The SVG will contain two `<circle>` elements:
  - **Background Circle**: A faintly colored ring indicating the full track.
  - **Progress Circle**: A colored ring (matching the primary brand color, e.g., `#256faf`) that will visually deplete as the timer counts down.
- CSS will be updated to center the text perfectly within the circle and handle the `stroke-dasharray` and `stroke-dashoffset` for smooth progress animation.

### 2. Logic Changes (`app/home/index.js`)
- **State Initialization**: When a session (Focus, Short Break, Long Break) starts, the total duration in seconds will be calculated and stored (`totalSeconds`).
- **Progress Calculation**: Inside the `timerFunction` (the interval callback that ticks every second), the remaining time will be calculated as a percentage of `totalSeconds`.
- **UI Update**: The percentage will be used to dynamically calculate and update the `stroke-dashoffset` CSS property of the Progress Circle. As time decreases, the offset increases, creating a depletion effect.
- **Resetting**: Upon session completion, pausing, or mode switching, the progress circle will be reset to 100% or to the correct starting state for the new session duration.

## Execution Steps
1. Modify `app/home/index.html` to insert the SVG structure around the timer.
2. Modify `app/home/style.css` to add styling and transition effects for the `.progress-ring__circle`.
3. Modify `app/home/index.js` to calculate total seconds and update the `stroke-dashoffset` on every tick of the timer interval.
4. Verify the smooth transition of the progress ring during active countdowns and mode changes.