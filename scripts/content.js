MODES = ["NORMAL", "INSERT", "SELECT"];
DEFAULT_MODE = MODES[0];

KEYMAPS = {
    "SIDEBAR_UP": "ctl+p",
    "SIDEBAR_DN": "ctl+n",
    "TEXTAREA": "hjkl",
};

class Results {
    #results;
    #index;
    #prev_idx;

    constructor() {
        this.#results = document.getElementById('search').querySelectorAll('[data-rpos]');
        this.#results.forEach((el) => {el.querySelector("div").style.padding = "10px"})
        console.log(this.#results);
        this.#index = 0;
        this.#prev_idx = 0;
        this.#updateFocus();
    }
    f

    #updateFocus() {
        console.log(this.#index + ", prev: "+ this.#prev_idx);
        let prev = this.#results[this.#prev_idx];
        let prevChild = prev.querySelector("div")
        let current = this.#results[this.#index];
        let child = current.querySelector("div")
        prevChild.style.border = "none";
        prevChild.style.backgroundColor = "transparent"
        prevChild.style.borderRadius = "none"

        child.style.border = "1px solid #6b2d5b";
        child.style.backgroundColor = "#e2d1e0"
        child.style.borderRadius = "10px"
        this.#prev_idx = this.#index;
        current.scrollIntoViewIfNeeded(true);
    }

    #toggleEffects() {
        
    }

    moveDown(i) {
        if (this.#index < this.#results.length - 1) {
            this.#index += i;
            this.#updateFocus();
        }
    }

    moveUp(i) {
        if (this.#index > 0) {
            this.#index -= i;
            this.#updateFocus();
        }
    }

    enter() {
        let current = this.#results[this.#index];
        let inner_link = current.querySelector('span a');
        // console.log(inner_span);
        inner_link.click();
    }
}

const RESULTS = new Results();

document.addEventListener("keydown", (e) => {
    // e.preventDefault();
    doAction(e.key);
    console.log(e.metaKey)
})

const doAction = (key) => {
    if (key == "j") {
        console.log("down -");
        RESULTS.moveDown(1);
    } else if (key == "k") {
        console.log("up +");
        RESULTS.moveUp(1);
    } else if(key == "Enter") {
        RESULTS.enter();
    } else {
        console.log("UNKNOWN KEY: "+key);
    }
}