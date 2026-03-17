import { waitForElement } from "./utils.js";
import type { ExtensionCore } from "./types.js";

export class UIManager {
  core: ExtensionCore;
  box!: HTMLDivElement;
  textarea!: HTMLTextAreaElement;
  host!: HTMLDivElement;

  constructor(core: ExtensionCore) {
    this.core = core;
  }

  async initUI(): Promise<void> {
    await waitForElement("body");

    this.box = document.createElement("div");
    const h1 = document.createElement("h1");
    h1.textContent = "Web Shortcuts Extension";

    const h2 = document.createElement("h2");
    h2.textContent = "Add your configurations here";

    const form = document.createElement("form");

    this.textarea = document.createElement("textarea");
    this.textarea.id = "asdf";

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Submit";
    button.addEventListener("click", (e) => {
      this.handleSubmitForm(e);
    });

    form.appendChild(this.textarea);
    form.appendChild(button);

    this.box.append(h1, h2, form);
    Object.assign(this.box.style, {
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
      if (!this.host.contains(e.target as Node)) {
        this.hideUI();
      }
    });
  }

  hideUI(): void {
    this.host.style.display = "none";
  }

  showUI(): void {
    this.textarea.value = JSON.stringify(this.core.config, null, "\t");
    this.host.style.display = "inline-block";
  }

  async handleSubmitForm(e: Event): Promise<void> {
    e.preventDefault();

    let configJSON: unknown = null;
    try {
      configJSON = JSON.parse(this.textarea.value);
    } catch (error) {
      console.error("JSON parsing error:", error);
      return;
    }

    await window.chrome.storage.local.set({
      configJSON: configJSON,
    });

    this.core.updateConfig(configJSON as never);
  }
}
