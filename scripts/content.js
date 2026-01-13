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
        console.log(this.#results);
        this.#index = 0;
        this.#prev_idx = 0;
        this.#updateFocus();
    }

    #updateFocus() {
        console.log(this.#index + ", prev: "+ this.#prev_idx);
        let prev = this.#results[this.#prev_idx];
        let current = this.#results[this.#index];
        prev.style.outline = "none";
        current.style.outline = "5px solid blue";
        current.style.borderRadius = "10px"
        this.#prev_idx = this.#index;
        current.scrollIntoViewIfNeeded(true);
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
})

const doAction = (key) => {
    // console.log("doing action for "+key)
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