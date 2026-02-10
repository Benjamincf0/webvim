// strategies/base.js
class SiteStrategy {
  // 1. Metadata
  static get id() { return 'base'; }

  // 2. The Contract (Methods every site must implement)
  focusSearch() { 
    console.warn('focusSearch not implemented for this site'); 
  }
  
  navigateList(direction) { 
    // direction: 1 for down, -1 for up
    console.warn('navigateList not implemented'); 
  }
  
  getGridItems() {
    return []; // Returns array of DOM elements for Hint Mode
  }
}