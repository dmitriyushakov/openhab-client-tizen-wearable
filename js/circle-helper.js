var circleHelper={
		pageShow:function(){},
		pageHide:function(){}
};

(function(tau) {
	/**
	 * page - Active page element
	 * list - NodeList object for lists in the page
	 * listHelper - Array for TAU snap list helper instances
	 */
	var page,
		list,
		listHelper = [],
		i, len;

	// This logic works only on circular device.
	if (tau.support.shape.circle) {
		/**
		 * pagebeforeshow event handler
		 * Do preparatory works and adds event listeners
		 */
		circleHelper.pageShow=function(page){
			list = page.querySelectorAll(".ui-listview:not(.select-mode-btn-list)");
			if (list) {
				/**
				 * Some pages don't use snap list.
				 */
				if (page.id !== "pageMarqueeList" && page.id !== "pageTestVirtualList" && page.id !== "pageAnimation") {
					len = list.length;
					for (i = 0; i < len; i++) {
						listHelper[i] = tau.helper.SnapListStyle.create(list[i]);
					}
				}
			}
		}
		
		document.addEventListener("pageshow", function (e) {
			page = e.target;
			circleHelper.pageShow(page);
		});

		/**
		 * pagebeforehide event handler
		 * Destroys and removes event listeners
		 */
		circleHelper.pageHide=function(){
			len = listHelper.length;
			/**
			 * Since the snap list helper attaches rotary event listener,
			 * you must destroy the helper before the page is closed.
			 */
			if (len) {
				for (i = 0; i < len; i++) {
					listHelper[i].destroy();
				}
				listHelper = [];
			}
		}
		
		document.addEventListener("pagebeforehide", function () {
			circleHelper.pageHide();
		});
	}
}(tau));
