Where AI saved time.
    Not having to type the code myself. 
    Not having to figure out the logic of what comes next or "if I do this in the HTML, where do I need to change it?"
    It could fix multiple problems at once. "The shuffle button doesn't have enough contrast and the cancel button doesn't even work" was one prompt that resolved two issues.

At least one AI bug you identified and how you fixed it.
    My shuffle button had white-on-white applied, so I couldn't see it. I asked to correct it, and it did, but then none of my buttons worked. The AI had corrected the issue by changing the display properties of a larger CLASS of buttons and that removed their functionality too. There is now a block in the CSS that fixes this (that AI wrote) that requires only the specific buttons into a high-contrast mode and doesn't change the whole class.

A code snippet you refactored for clarity.
    When I asked to make a hamburger menu from the sidebar, AI made me a second header which was unnecessary. I removed all the extra lines from the second header and the CSS associated, realized the only thing that needed changed was adding the menu to the header, and just added the menu into the existing header.     
    
        <header class="site-header">
            <div class="container header-layout">
                <div class="header-left">
                <button id="btn-menu" class="btn-icon mobile-only" aria-label="Toggle menu">☰</button>
                <h1>Flashcards</h1>
                </div>

                <button id="btn-new-deck" class="btn-primary">+ New Deck</button>
            </div>
        </header>

One accessibility improvement you added.
    I added a hamburger menu for mobile users/small screens with AI's help and then asked AI to make it accessible.
    
What prompt changes improved AI output.
    When I told it to take the linked files into account, I stopped getting so many errors.
    When I asked for minimal changes to non-related code, it was faster.
    When I used another AI to format my prompts before feeding them to CoPilot, it seemed easier to work with. (I felt better understood.)