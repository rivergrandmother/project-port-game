# river

A simple 2D side-scrolling boat game inspired by navigating the River Thames in London. Dodge obstacles and survive as long as possible!

## File Structure

- `index.html` - Main HTML file with canvas and UI elements
- `style.css` - Styles for layout, responsiveness, and screens
- `game.js` - Core game logic, rendering, and input handling
- `README.md` - This file

## How to Run Locally

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge).
2. The game will load and display the start screen.
3. Click "Start Game" or use controls to begin.

## Controls

- **Desktop**: Arrow keys or WASD to move the boat.
- **Mobile**: Touch and drag on the canvas to move.

## Game Features

- Endless side-scrolling gameplay
- Increasing difficulty over time
- Score based on survival time
- Responsive design for desktop and mobile
- Simple collision detection
- Parallax background layers with Thames-inspired visuals

## Technical Notes

- Uses HTML5 Canvas for rendering
- No external dependencies
- Runs entirely client-side
- Optimized for static hosting

## Known Limitations

- Requires a modern browser with HTML5 Canvas support (Chrome 9+, Firefox 3.6+, Safari 5+, Edge 12+).
- No audio or sound effects.
- Simple graphics and controls; not optimized for high-performance gaming.
- Touch controls may vary on different mobile devices.
- Game state is not saved; score resets on page reload.
- May not work on very old or low-powered devices.
- No accessibility features (e.g., screen reader support).