var openhabWgtProgressbarCallback=null;

function openProgressbarForSlider(widgetId){
	openhabWgtProgressbarCallback=function(){
		var ohWidget=openhabSitemap.widgets[widgetId];
		var step=10;
		var minValue=0;
		var maxValue=100;
		if(ohWidget.type=="Setpoint"){
			var progressElem=$("#pageCircleProgressBar progress.ui-circle-progress");
			if(ohWidget.step)step=ohWidget.step;
			$("#pageCircleProgressBar .ui-title").text(ohWidget.label);
			progressElem.attr("max",ohWidget.maxValue-ohWidget.minValue);
			minValue=ohWidget.minValue;
			maxValue=ohWidget.maxValue;
			progressElem.val(ohWidget.item.state==="NULL"?0:(parseFloat(ohWidget.item.state)-ohWidget.minValue));

			$("#pageCircleProgressBar #minus").text("-"+step);
			$("#pageCircleProgressBar #plus").text("+"+step);
		}else{
			$("#pageCircleProgressBar .ui-title").text(ohWidget.label);
			$("#pageCircleProgressBar progress.ui-circle-progress").val(ohWidget.item.state==="NULL"?0:parseFloat(ohWidget.item.state));
		}
		
		/**
		 * page - Progress page element
		 * progressBar - Circle progress element
		 * minusBtn - Minus button element
		 * plusBtn - Plus button element
		 * resultDiv - Indicator element for the progress percentage
		 * isCircle - TAU button instance for delete button
		 * progressBarWidget - TAU circle progress instance
		 * resultText - Text value for the progress percentage
		 * pageBeforeShowHandler - pagebeforeshow event handler
		 * pageHideHandler - pagehide event handler
		 */
		var page = document.getElementById( "pageCircleProgressBar" ),
		progressBar = document.getElementById("circleprogress"),
		minusBtn = document.getElementById("minus"),
		plusBtn = document.getElementById("plus"),
		resultDiv = document.getElementById("result"),
		isCircle = tau.support.shape.circle,
		progressBarWidget,
		resultText,
		pageBeforeShowHandler,
		pageHideHandler,
		i;
	
		/**
		 * Updates the percentage of the progress
		 */
		function printResult() {
			resultText = parseFloat(progressBarWidget.value())+minValue;
			resultDiv.innerHTML = resultText + "%";
			if(ohWidget.type=="Slider"){
				resultDiv.innerHTML = resultText + "%";
			}else{
				resultDiv.innerHTML = resultText;
			}
		}
	
		/**
		 * Initializes global variables
		 */
		function clearVariables() {
			page = null;
			progressBar = null;
			minusBtn = null;
			plusBtn = null;
			resultDiv = null;
		}
	
		/**
		 * Click event handler for minus button
		 */
		function minusBtnClickHandler() {
			i = i-step;
			if (i < minValue) {
				i=minValue;
			}
			progressBarWidget.value(i);
			printResult();
		}
	
		/**
		 * Click event handler for plus button
		 */
		function plusBtnClickHandler() {
			i = i+step;
			if (i > maxValue) {
				i=maxValue;
			}
			progressBarWidget.value(i);
			printResult();
		}
	
		/**
		 * Rotary event handler
		 */
		function rotaryDetentHandler() {
			// Get rotary direction
			var direction = event.detail.direction
			var value;
			if(ohWidget.type==="Slider"){
				value = parseInt(progressBarWidget.value(), 10);
			}else{
				value = parseFloat(progressBarWidget.value(), 10)+minValue;
			}
	
			if (direction === "CW") {
				// Right direction
				if (value < maxValue) {
					value+=(ohWidget.type==="Slider")?1:step;
				} else {
					value = maxValue;
				}
			} else if (direction === "CCW") {
				// Left direction
				if (value > minValue) {
					value-=(ohWidget.type==="Slider")?1:step;
				} else {
					value = minValue;
				}
			}
	
			progressBarWidget.value(value-minValue);
			printResult();
		}
	
		/**
		 * Removes event listeners
		 */
		function unbindEvents() {
			page.removeEventListener("pageshow", pageBeforeShowHandler);
			page.removeEventListener("pagehide", pageHideHandler);
			if (isCircle) {
				document.removeEventListener("rotarydetent", rotaryDetentHandler);
			} else {
				minusBtn.removeEventListener("click", minusBtnClickHandler);
				plusBtn.removeEventListener("click", plusBtnClickHandler);
			}
		}
	
		/**
		 * pagebeforeshow event handler
		 * Do preparatory works and adds event listeners
		 */
		pageBeforeShowHandler = function () {
			if (isCircle) {
			// make Circle Progressbar object
				progressBarWidget = new tau.widget.CircleProgressBar(progressBar, {size: "full"});
				document.addEventListener("rotarydetent", rotaryDetentHandler);
			} else {
				progressBarWidget = new tau.widget.CircleProgressBar(progressBar, {size: "large"});
				minusBtn.addEventListener("click", minusBtnClickHandler);
				plusBtn.addEventListener("click", plusBtnClickHandler);
			}
	
			if(ohWidget.type=="Slider"){
				i = parseInt(progressBarWidget.value(), 10);
				resultDiv.innerHTML = i + "%";
			}else{
				i = parseFloat(progressBarWidget.value(), 10)+minValue;
				resultDiv.innerHTML = String(i);
			}
		};
	
		/**
		 * pagehide event handler
		 * Destroys and removes event listeners
		 */
		pageHideHandler = function () {
			var progressBarElem=$("#pageCircleProgressBar progress.ui-circle-progress");
			var value=(ohWidget.type==="Slider")?progressBarElem.val():(progressBarElem.val()+minValue);
			sendCommand(ohWidget,String(value))
			unbindEvents();
			clearVariables();
			// release object
			progressBarWidget.destroy();
		};
	
		page.addEventListener("pagebeforeshow", pageBeforeShowHandler);
		page.addEventListener("pagehide", pageHideHandler);
	}
	
	tau.changePage("slider-progress.html");
}