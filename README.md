# Clean Structured Website

This project demonstrates a clean code organization with separate folders for different assets.

## Project Structure

```
project/
├── css/                     # All CSS styles
│   ├── styles.css           # Main website styles
│   └── game.css             # Game-specific styles
├── js/                      # JavaScript files
│   ├── main.js              # Main website functionality
│   └── game.js              # Game logic and functionality
├── img/                     # Image assets
│   ├── bg_480_1.webp
│   ├── golden_label.webp
│   ├── menu_bg.webp
│   └── menu_bg_2.webp
├── index.html               # Main website
├── game.html                # Game page
└── README.md                # Project documentation
```

## Benefits of This Structure

1. **Separation of Concerns**: Code is organized by function (HTML, CSS, JS, images)
2. **Improved Maintainability**: Easier to find and update specific file types
3. **Better Performance**: Allows browsers to cache different asset types efficiently
4. **Cleaner Code**: Reduced clutter in each file
5. **Team Collaboration**: Different team members can work on different aspects without conflicts

## Project Contents

### Main Website
The `index.html` file contains a responsive website layout with a navigation menu, sections for home, features, about, and contact.

### Game - God Smite: Birds and Bears
The `game.html` file contains a simple browser-based game where the player smites birds and bears from the sky. The game includes:
- Dynamic spawning of birds and bears
- Automatic weapon firing when moving the mouse
- Collision detection
- Visual effects for hits
- Responsive canvas that resizes with the browser

## How to Use

1. Open `index.html` in your browser to view the main website
2. Open `game.html` to play the game
3. Modify CSS in the `css/` directory
4. Edit JavaScript functionality in the `js/` directory
5. Add or replace images in the `img/` directory

## Future Improvements

- Add more pages in the root directory
- Create subdirectories for different page components
- Implement a build process for production optimization
- Add more levels to the game
- Implement scoring system 