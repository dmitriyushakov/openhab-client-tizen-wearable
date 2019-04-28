var openhabWgtColorpickerCallback=null;
var kellyColorPicker=null;

function openColorpicker(widgetId){
	openhabWgtColorpickerCallback=function(){
		var ohWidget=openhabSitemap.widgets[widgetId];
		var isCircle = tau.support.shape.circle;
		var page = document.getElementById( "pageCircleColorpicker" );
	
		/**
		 * Rotary event handler
		 */
		function rotaryDetentHandler() {
			var direction = event.detail.direction
			var hue=kellyColorPicker.getCurColorHsv().h;
	
			if (direction === "CW") {
				hue+=1/24;
				if(hue>1)hue-=1;
			} else if (direction === "CCW") {
				hue-=1/24;
				if(hue<0)hue+=1;
			}
			
			kellyColorPicker.setHue(hue);
		}
	
		/**
		 * Removes event listeners
		 */
		function unbindEvents() {
			page.removeEventListener("pageshow", pageBeforeShowHandler);
			page.removeEventListener("pagehide", pageHideHandler);
			if (isCircle) {
				document.removeEventListener("rotarydetent", rotaryDetentHandler);
			}
		}
	
		/**
		 * pagebeforeshow event handler
		 * Do preparatory works and adds event listeners
		 */
		pageBeforeShowHandler = function () {
			kellyColorPicker=new KellyColorPicker({place : 'picker', size : Math.min(document.height,document.width), method: "triangle"});
			if(ohWidget.item.state!=='NULL'){
				var components=ohWidget.item.state.split(',');
				var brigtness=2-(200*parseFloat(components[2]))/(39*parseFloat(components[1]));//Don't ask me what this mean
				if(brigtness>1)brigtness=1;
				else if(brigtness<0)brigtness=0;
				kellyColorPicker.setHSV(parseFloat(components[0])/360,parseFloat(components[1])/100,brigtness)
			}
			
			if (isCircle) {
				document.addEventListener("rotarydetent", rotaryDetentHandler);
			}
		};
	
		/**
		 * pagehide event handler
		 * Destroys and removes event listeners
		 */
		pageHideHandler = function () {
			var hsv=kellyColorPicker.getCurColorHsv();
			
			var brightness=hsv.v*(2-hsv.s)/2
			
			sendCommand(ohWidget,(hsv.h*360)+","+(hsv.s*100)+","+(brightness*39));
			unbindEvents();
		};
	
		page.addEventListener("pagebeforeshow", pageBeforeShowHandler);
		page.addEventListener("pagehide", pageHideHandler);
	}
	
	tau.changePage("colorpicker.html");
}