import { waitForElement, log } from "./utils.js";

export class UIManager {
  constructor(core) {
    this.core = core;
    // TODO: Create a UIManager class connected to ExtensionCore that handles UI
    //    - add a shortcut to show a small menu with a form
    //    - small form to edit config & save to browser storage
    //    - at the start, load file from storage to generate config json.
  }

  async initUI() {
    await waitForElement("body");

    this.box = document.createElement("div");
    // 1. Create Heading 1
    const h1 = document.createElement("h1");
    h1.textContent = "Web Shortcuts Extension";

    // 2. Create Heading 2
    const h2 = document.createElement("h2");
    h2.textContent = "Add your configurations here";

    // 3. Create Form and its children
    const form = document.createElement("form");

    this.textarea = document.createElement("textarea");
    this.textarea.id = "asdf";

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Submit"; // Buttons usually need label text
    button.addEventListener("click", (e) => {
      this.handleSubmitForm(e);
    });

    // 4. Assemble the form
    form.appendChild(this.textarea);
    form.appendChild(button);

    // 5. Add everything to your container (this.box)
    this.box.append(h1, h2, form);
    Object.assign(this.box.style, {
      // all: 'revert',
      position: "fixed",
      top: "10px",
      right: "10px",
      zIndex: "2147483647",
      background: "#000000",
      color: "#ffffff",
      padding: "25px",
      borderRadius: "10px",
      width: "80vw",
      font: "sans-serif",
    });

    Object.assign(this.textarea.style, {
      display: "block",
      height: "150px",
      width: "100%",
    });

    Object.assign(button.style, {
      width: "100%",
      height: "45px",
    });

    this.host = document.createElement("div");
    this.hideUI();
    document.body.appendChild(this.host);
    const shadow = this.host.attachShadow({ mode: "closed" });
    shadow.appendChild(this.box);

    document.body.addEventListener("click", (e) => {
      if (!this.host.contains(e.target)) {
        this.hideUI();
      }
    });
  }

  hideUI() {
    this.host.style.display = "none";
  }

  showUI() {
    this.textarea.value = JSON.stringify(this.core.config, null, "\t");
    this.host.style.display = "inline-block";
  }

  async handleSubmitForm(e) {
    e.preventDefault();
    log.info(e);

    // await new Promise((resolve) => setTimeout(resolve, 2000)); // wooo waiting lmao
    let configJSON = null;
    log.info(this.textarea.value);
    try {
      configJSON = JSON.parse(this.textarea.value);
    } catch (error) {
      log.error("JSON aint legit bruh " + error);
      return;
    }

    await chrome.storage.local.set({
      configJSON: configJSON,
    });
    log.info(`Data saved! : ${configJSON}`);

    this.core.updateConfig(configJSON);
  }
}
