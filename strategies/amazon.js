	// strategies/amazon.js
	class AmazonStrategy extends SiteStrategy {
	  focusSearch() {
	    const input = document.querySelector('#twotabsearchtextbox');
	    if (input) input.focus();
	  }
	}