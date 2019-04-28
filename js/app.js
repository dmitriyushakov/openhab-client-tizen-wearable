(function() {
	/**
	 * Back key event handler
	 */
	window.addEventListener('tizenhwkey', function(ev) {
		if (ev.keyName === "back") {
			var page = document.getElementsByClassName('ui-page-active')[0],
				pageid = page ? page.id : "";
			if (pageid === "main") {
				try {
					tizen.application.getCurrentApplication().exit();
				} catch (ignore) {
				}
			} else {
				window.history.back();
			}
		}
	});
	window.addEventListener('pageshow', function(ev) {
		var page = document.getElementsByClassName('ui-page-active')[0];
		var pageid = $(page).attr("openhab-pageid")
		if(openhabSitemap && pageid){
			updateWidgets(openhabSitemap.name,pageid);
			unsubscribeFromAllPages();
			listenPage(openhabSitemap.name,pageid);
		}
	});
}());
