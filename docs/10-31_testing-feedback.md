

# Gameplay Experience

The game opens to the Main Menu screen.

The title of the game is displayed in a large unique font/design and below it are a list of selectable options. These options are:
- Start New Game
- Load Saved Game
- Settings
- Quit

When the user selects 'Start New Game' a new save file is started. The player is brought to the Character Creation screen.

The Character Creation screen allows the user to select:
- Name: The user's choice of name that will be used in dialogue throughout the game.
- Gender: The user's choice of gender: Male, Female, or Other. If the player selects other, they are presented with pronoun choices: He/Him, She/Her, They/Them, It/Itself, Ze/Hir, Xe/Xem, Ver/Vir, Te/Tem, Ey/Em. These choices will guide how dialogue is phrased throughout the game.
- Appearance: The color of their skin, hair, and eyes. Using a color picker that lets them pick one of any hex color for each of the appearance categories. These choices will decide how the player character is rendered throughout the gameplay.
- [See Character Creation section]

When the selections are chosen, the user clicks/taps a 'Start Game' button to progress into beginning the game.
They may also click a 'Nevermind' button to cancel their selections, purge the new save file, and return to the Main Menu screen.

The player character sprite begins with a default light gray shirt, dark blue pants, and black shoes.

## Stage 0 gameplay

The game starts when the player waking up in their room. There are multiple objects in their room. 
- Bed: The room has a bed, that's where the player spawns in. The blanket on the bed covers the player's body so only their head is visible while they are 'in' it. The rest of the bed, the top portion, appears under the player. The player moves out of bed on the X axis, moving in the Y axis causes a collision. The bed should be placed near the top left corner of the room.
- TV: The room has a TV on a small table, when the player walks up and interacts with the TV it presents a single step of dialogue that describes the show that's on. It's a news report about how AI is taking everyone's jobs. The TV should be placed to the right of the bed, on the north wall of the room, with a non-interactable bed-side table to it's left.
- Laptop: The room has a Laptop on a desk. When the user walks up to the laptop and interacts with it, the dialogue prompt explains: this is your prized possession, a 'Dull Computers' 15" Laptop with a 2Ghz 8-Core processor, 16GB of ram, a 500GB SSD, and integrated graphics. The dialogue prompt presents the option to pick up the Laptop and add it to their inventory, OR leave it on the desk. Picking the first option adds it as an item in the player's inventory. The laptop and desk should be placed to the right of the TV, along the north wall of the room.
- Bookshelf: The room has a bookshelf along one of the walls, when the user interacts with it the single step of dialog explains something about there being many manga series, fantasy novels, and interesting tech magazines on it. The bookshelf should be placed on the east wall of the room, and there could be multiple bookshelves that all provide the same interaction dialogue.
- Poster: One of the wall tiles in the room has a poster on it. Interacting with it gives a dialogue prompt describing a rich and powerful trillionaire that wants to save the world - what an inspiration! The poster should be placed on the west wall of the room, near the middle of the room on the Y axis.
- Stairs: At the south east corner of the room should be some stairs. When the player collides with the stairs they are brought to the first floor of the house.

On the first floor of the house is the player's parent. The game should randomly select this parent to be either their Mother, their Father, their Grandmother, or their Grandfather. Interacting with the parent presents warm dialogue that indicates that their programming lesson is about to begin, so the player should go over to the Coding School and not be late.
There is a sofa on the first floor room, a coffee table in front of the sofa, a large potted plant in one of the corners of the room, and the stairs that the player warps to from the second story in the south east corner of the room. There is a door opening in the middle of the south wall. When the user passes through the door opening, they are brought outside.

Outside in the town is the player's house that they just exited, next door (to the west) is another house of equal size, and further away to the east is the Coding School. The Coding School is a larger building than the houses. A path on the ground connects the houses and the coding school. The rest of the ground is grass, with the occasional tree sporadically placed throughout the grassy area. The path diverges to the south between the the next door house and the Coding school building. This diverging path wraps around a fourth building, that is the Store.
There are two people outside in the town that the player may interact with. One of their dialogue talks about not understanding what all this nonsense about AI, and the other's dialogue talks about how they used to be a programmer once until they took an exception to the knee.

The player may open their inventory and select their laptop to open it. This will open a pseudo terminal screen, where we provide some linux-like interaction and the screen behaves similarly to a linux computer. They can browse some files, open them with nano, and/or run the 'idkcode' program. IdkCode is the code editor. When they open the code editor program, a similar UI to the combat screen opens. The Code Mirror code editor opens to the user, with the list UI showing like a list of files to mimic opening a code project in a code editor like visual studio code. This is the player's spellbook - of sorts. Helper prompts should walk them through the commands that are available and guide them to open the code editor. This will let them experiment with coding right away, although they won't have much available to work with in Stage 0. As they progress through the game they will be using the laptop idkcode editor to learn about what moves they have, build custom moves, and practice coding. [See Laptop/IdkCode section]

If the user attempts to enter the Store building, a dialogue prompt is shown that explains that it's still too early - the Store isn't open yet.

When the user enters the Coding School building, Stage 1 gameplay begins.

## Stage 1 gameplay



# Laptop item

The Laptop item can be thought of as what traditional RPGs regard as a weapon. It can be equiped to the player's worn inventory, it helps decide their combat capability, and may be upgraded in limited ways to improve that capability. The user recieves their first one from their bedroom in Stage 0 (optional) or Stage 1 (required). When they pick up their first Laptop from their bedroom during Stage 0, they have the freedom to self-discover equipping it, opening it, and using it. If they do not pick it up during Stage 0, when they pick it up after they are prompted to return to their bedroom to pick it up in Stage 1 but before returning to the Code School building, the user should be restricted from equipping it - being urged to return to the Code School instead. 

## Upgrading

The player may find or be rewarded with computer parts like RAM and SSD sticks. 

## Replacing

## Mock OS with xterm.js


# JavaScript learning

Main topics: Comments, Variables, Comparisons, Functions, Objects, Classes, Prototypes, Loops, Arrays, Errors, Sets, Maps, Promises, 

## Comments

## Variables

### Declaration

### Numbers

### Increment and Decrement

### Undeclared, Undefined, and Null

### Same line declaration

### Strings

### Template Literals

### Semi-Colons

### Camel Case

## Comparisons

### if, else if, and else

### Comparison Operators

### Strict Equality

### Logical Operators

### Switch statements

### Ternary Operator

### Truthy and Falsy

### Nullish Coalescing




# random thoughts while testing
- Add an upstairs in the first house
- Add furniture to the first house (both floors)
- Add 4 more buildings in the village
    - Add two more houses
    - Add a store building with a shopkeeper that has store interaction
    - Add a developer school building with a teacher that provides training interaction

## notes to self
- Try using https://www.mapeditor.org/
