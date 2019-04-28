var LANG_JSON_DATA={};
var openhabSitemap=null;
var openhabPageTemplate=null;
var multibuttonRadioPageCallback=null;
var openedEventSubscriptions=[];
var mainPageObservable=null;
var mainPage=null;
var configUsageOrder=[
    		  {
    			  configName:"local-server-settings",
    			  sitemapWaitMessage:function(){return getLocaleString("try_connect_to_loc_server","Try to connect to local server...")}
    		  },
    		  {
    			  configName:"remote-server-settings",
    			  sitemapWaitMessage:function(){return getLocaleString("try_connect_to_rem_server","Try to connect to remote server...")}
    		  },
	  ];
var currentConfig=null;

var updateWidgetMethods={
		SimpleSwitch:function(item,state){
			item.checked=(state==="ON");
		},
		TextSub:function(item,state,label){
			$(item).text(extractWidgetSubText({label:label}));
		},
		Slider:function(item,state){
			$(item).text(state);
		},
		Setpoint:function(item,state){
			$(item).text(state);
		},
		Colorpicker:function(item,state){
			$(item).css("color",OHColorToCSS(state));
		},
		SwitchSub:function(item,state,widgetLabel,widgetId){
			$(item).text(extractMappingValue(widgetId,state))
		}
}

ko.bindingHandlers.openhabWgt = {
    update: function(element, valueAccessor) {
        var value = valueAccessor();
        var valueUnwrapped = ko.unwrap(value);
        $(element).attr("openhab-widget",valueUnwrapped);
    }
};

ko.bindingHandlers.openhabPageId = {
    update: function(element, valueAccessor) {
        var value = valueAccessor();
        var valueUnwrapped = ko.unwrap(value);
        $(element).attr("openhab-pageid",valueUnwrapped);
    }
}

function getLocaleString(key,defaultStr){
	if(LANG_JSON_DATA===undefined)return defaultStr;
	var localeStr=LANG_JSON_DATA[key];
	return localeStr?localeStr:defaultStr;
}

function parseSitemap(sitemap){
	var pagesObj={}
	var widgetsObj={}
	
	function visitPage(page) {
		function addWidget(widget){
			widgetsObj[widget.widgetId]=widget;
			widgets[widgets.length]=widget;
		}
		
		function listWidgets(widgetsArr){
			for(var i=0;i<widgetsArr.length;i++){
				var wgt=widgetsArr[i];
				
				if(wgt.type=="Frame"){
					listWidgets(wgt.widgets);
				}else{
					var wgtToAdd={
							widgetId:wgt.widgetId,
							type:wgt.type,
							label:wgt.label,
							icon:wgt.icon,
							mappings:wgt.mappings,
							item:wgt.item
						};
					
					if(wgt.type==="Setpoint"){
						wgtToAdd.minValue=wgt.minValue;
						wgtToAdd.maxValue=wgt.maxValue;
						wgtToAdd.step=wgt.step;
					}
					
					if(wgt.linkedPage)wgtToAdd.linkedPage=visitPage(wgt.linkedPage);
					
					addWidget(wgtToAdd);
				}
			}
		}
		
		var widgets=[];
		
		listWidgets(page.widgets);
		
		var resultPage={
				id:page.id,
				title:page.title,
				icon:page.icon,
				widgets:widgets
		};
		
		pagesObj[resultPage.id]=resultPage;
		
		return resultPage;
	}
	
	
	var outSitemap={
			name:sitemap.name,
			label:sitemap.label,
			homepage:visitPage(sitemap.homepage)
	}
	
	outSitemap.pages=pagesObj;
	outSitemap.widgets=widgetsObj;
	
	return outSitemap;
}

function openSettingsPage(){
	tau.changePage("settings.html");
}

function unsubscribeFromAllPages(){
	for(var i=0;i<openedEventSubscriptions.length;i++){
		openedEventSubscriptions[i].eventSource.close();
	}
	openedEventSubscriptions=[];
}

function applyMainPage(page,data,options){
	var doSubscribe=!options || options&&(options.subscribe!==false);
	
	$(".ko-ready-page").removeClass("ko-ready-page");
	
	function applyObservable(data,page){
		if(mainPageObservable===null){
			mainPageObservable=ko.observable(data);
			ko.applyBindings(mainPageObservable,page);
		}else{
			mainPageObservable(data);
		}
	}
	
	if(data.fail||(data.loaded===false)){
		applyObservable(data,page);
	}else{
		openhabSitemap=parseSitemap(data);
		
		applyObservable(openhabSitemap.homepage,page);
		
		$(page).find(".openhab-widgets-list").show();
		circleHelper.pageHide();
		circleHelper.pageShow(page);
		
		listenPage(openhabSitemap.name,openhabSitemap.homepage.id);
	}
}

function showFailPage(page,title,message){
	applyMainPage(page,{
			fail:true,
			title:title,
			message:message
		},{subscribe:false});
}

function setupMainPage(){
	var page=null;
	
	mainPageObservable=null;
	var page=$(".ko-ready-page").get(0);
	$(page).find(".more-options-btn").click(openSettingsPage);
	
	openhabPageTemplate=page.cloneNode(true);
	openhabPageTemplate.removeAttribute("id");
	
	setupPageTriggers(page);
	mainPage=page;
	
	return page;
}

function switchToNextConfig(){
	var currentConfigIndex=0;
	if(currentConfig!==null){
		for(var i=0;i<configUsageOrder.length;i++){
			if(currentConfig.configName==configUsageOrder[i].configName){
				currentConfigIndex=i+1;
				if(i==configUsageOrder.length-1){
					closeProcessing();
					currentConfig=null;
					return false;
				}
				break;
			}
		}
	}
	
	var configData=configUsageOrder[currentConfigIndex];
	var config=localStorage.getItem(configData.configName);
	
	if(config===null){
		currentConfig=configData;
		return switchToNextConfig();
	}else{
		currentConfig=JSON.parse(config);
		currentConfig.configName=configData.configName;
		currentConfig.sitemapWaitMessage=configData.sitemapWaitMessage;
		
		showProcessing(configData.sitemapWaitMessage());
		
		return true;
	}
}

function getServerAddress(address){
	if(address===undefined || address===null) address=currentConfig.address;
	return (address.lastIndexOf("/")+1==address.length)?(address.substr(0,address.length-1)):address;
}

function loadMainPage(reload){
	reload=reload?true:false;
	
	if(reload){
		unsubscribeFromAllPages();
		currentConfig=null;
	}
	
	var haveConfig=false;
	if(currentConfig===null){
		var haveConfig=switchToNextConfig();
	}else haveConfig=true;
	
	if(!haveConfig){
		var page=mainPage?mainPage:setupMainPage();
		showFailPage(page,getLocaleString("welcome","Welcome"),getLocaleString("configure_server","Please configure your server first"));
	}else if(openhabSitemap===null){
		var sitemapName=localStorage.getItem("sitemap");
		var page=mainPage?mainPage:setupMainPage();
		applyMainPage(page,{title:getLocaleString("loading","Loading..."),loaded:false},{subscribe:false});
		
		if(sitemapName===null){
			closeProcessing();
			showFailPage(page,getLocaleString("one_moment","One moment"),getLocaleString("select_sitemap","Please select sitemap in settings"));
		}else $.ajax({
			url:getServerAddress()+"/rest/sitemaps/"+sitemapName,
			dataType:"json",
			method:"GET",
			username:(currentConfig.username===""?null:currentConfig.username),
			password:(currentConfig.password===""?null:currentConfig.password)
		})
		.done(function(data){
			closeProcessing();
			applyMainPage(page,data);
		}).fail(function(){
			var res=switchToNextConfig();
			
			if(res){
				loadMainPage();
			}else{
				showFailPage(page,getLocaleString("fail","Fail"),getLocaleString("unable_to_load_sitemap","Unable to load sitemap"));
			}
		});
	}
}

function updateWidgets(sitemapName,pageId){
	var page=mainPage?mainPage:setupMainPage();
	$.ajax({
		url:getServerAddress()+"/rest/sitemaps/"+sitemapName+"/"+pageId,
		dataType:"json",
		method:"GET",
		username:(currentConfig.username===""?null:currentConfig.username),
		password:(currentConfig.password===""?null:currentConfig.password)
	})
	.done(function(data){
		for(var i=0;i<data.widgets.length;i++){
			var wgt=data.widgets[i];
			if(wgt.item)updateWidget(wgt.widgetId,wgt.item.state,wgt.label)
		}
	}).fail(function(){
		showFailPage(page,getLocaleString("fail","Fail"),getLocaleString("unable_to_load_sitemap","Unable to load sitemap"));
	});
}

function reloadMainPage(){
	loadMainPage(true);
}

function sendCommand(item,command){
	updateWidget(item.widgetId,command,item.label);
	$.ajax({
		url:getServerAddress()+"/rest/items/"+item.item.name,
		method:"POST",
		contentType:"text/plain",
		data:command,
		username:(currentConfig.username===""?null:currentConfig.username),
		password:(currentConfig.password===""?null:currentConfig.password)
	});
}

function makePageUnique(pageNode){
	pageNode.id=tau.getUniqueId();
	pageNode.setAttribute("data-url",location.pathname.substring(0,location.pathname.lastIndexOf('/')+1)+pageNode.id+".html");
}

function openPageById(pageId){
	if(openhabSitemap){
		var pageNode=openhabPageTemplate.cloneNode(true);
		makePageUnique(pageNode);
		
		tau.changePage(pageNode);
		var page=$(".ko-ready-page").get(0);
		$(".ko-ready-page").removeClass("ko-ready-page");
		ko.applyBindings(openhabSitemap.pages[pageId],page);
		$(page).find(".openhab-widgets-list").show();
		$(page).find(".more-options-btn").remove();
		
		unsubscribeFromAllPages();
		listenPage(openhabSitemap.name,pageId);
		updateWidgets(openhabSitemap.name,pageId);
	}
}

function openLink(data){
	if(data.linkedPage){
		openPageById(data.linkedPage.id);
	}
}

function listenPage(sitemapId,pageId){
	for(var i=0;i<openedEventSubscriptions.length;i++){
		var subscription=openedEventSubscriptions[i];
		
		if(subscription.sitemapId===sitemapId && subscription.pageId === pageId){
			return;
		}
	}
	
	$.ajax({
		url:getServerAddress()+"/rest/sitemaps/events/subscribe",
		method:"POST",
		dataType:"json",
		username:(currentConfig.username===""?null:currentConfig.username),
		password:(currentConfig.password===""?null:currentConfig.password)
	})
		.done(function(data){
			if(data.status==="CREATED"){
				var subscription={
						sitemapId:sitemapId,
						pageId:pageId,
						url:data.context.headers.Location[0]
				}
				
			    var eventSource = new EventSource(subscription.url+"?sitemap="+sitemapId+"&pageid="+pageId);
				subscription.eventSource=eventSource;
				
				eventSource.addEventListener('event', function(e) {
					var data=JSON.parse(e.data);
					updateWidget(data.widgetId,data.item.state,data.label)
				});
			    
			    openedEventSubscriptions[openedEventSubscriptions.length]=subscription;
			}
		});
}

function updateStoredWidgetState(widgetId,itemState,widgetLabel){
	var wgt=openhabSitemap.widgets[widgetId];
	if(wgt){
		wgt.item.state=itemState;
		if(widgetLabel)wgt.label=widgetLabel;
	}
}

function findWidgetsById(widgetId){
	var item=$("[openhab-widget='"+widgetId+"']");
	
	if(item.length===0)return null;
	else{
		var resultArr=[];
		for(var i=0;i<item.length;i++){
			resultArr[i]=item.get(i);
		}
		return resultArr;
	}
}

function updateWidget(widgetId,itemState,widgetLabel){
	updateStoredWidgetState(widgetId,itemState,widgetLabel);
	var items=findWidgetsById(widgetId);
	if(items!==null){
		for(var i=0;i<items.length;i++){
			var item=items[i];
			var widgetType=$(item).attr("openhab-widget-type");
			var updateMethod=updateWidgetMethods[widgetType];
			if(updateMethod)updateMethod(item,itemState,widgetLabel,widgetId);
		}
	}
}

function widgetHaveSubText(widget){
	var lbl=widget.label;
	var firstIndex=lbl.indexOf("[")
	var lastIndex=lbl.indexOf("]")
	return firstIndex!==-1 && lastIndex!==-1 && lastIndex>firstIndex;
}

function extractWidgetSubText(widget){
	var lbl=widget.label;
	var firstIndex=lbl.indexOf("[")
	var lastIndex=lbl.indexOf("]")
	return (firstIndex!==-1 && lastIndex!==-1 && lastIndex>firstIndex)?lbl.substr(firstIndex+1,lastIndex-firstIndex-1):"";
}

function extractWidgetLabel(widget){
	var lbl=widget.label;
	var firstIndex=lbl.indexOf("[")
	var lastIndex=lbl.indexOf("]")
	return (firstIndex!==-1 && lastIndex!==-1 && lastIndex>firstIndex)?lbl.substr(0,firstIndex-1):lbl;
}

function OHColorToCSS(ohColor){
	var colorStrings=ohColor.split(",");
	
	var outColorString="hsl("+Math.floor(parseFloat(colorStrings[0]))+","+Math.floor(parseFloat(colorStrings[1]))+"%,"+Math.floor(parseFloat(colorStrings[2])*100/39)+"%)";
	
	return outColorString;
}

function openMultibuttonRadioPage(widgetId){
	var wgt=openhabSitemap.widgets[widgetId];
	
	if(wgt){
		multibuttonRadioPageCallback=function(){
			var page=document.getElementById("multibutton-radio-page");
			
			function unbindEvents() {
				page.removeEventListener("pageshow", pageBeforeShowHandler);
				page.removeEventListener("pagehide", pageHideHandler);
			}
			
			pageBeforeShowHandler = function () {
				ko.applyBindings(wgt,page);
			};
		
			pageHideHandler = function () {
				unbindEvents();
				var radio=$("#multibutton-radio-page input:checked");
				if(radio.length!=0){
					sendCommand(wgt,radio.val());
				}
			};
		
			page.addEventListener("pagebeforeshow", pageBeforeShowHandler);
			page.addEventListener("pagehide", pageHideHandler);
		}
		
		tau.changePage("multibutton-radio.html");
	}
}

function extractMappingValue(widgetId,value){
	var widget=openhabSitemap.widgets[widgetId];
	if(!value)value=widget.item.state;
	
	if(widget){
		for(var i=0;i<widget.mappings.length;i++){
			var mapping=widget.mappings[i];
			if(mapping.command==value)return mapping.label;
		}
		
		return "";
	}
}

function showProcessing(description){
	var processingPage=$("#smallProcessingPage");
	if(processingPage.length==0){
		var processingPage=$('<div class="ui-page ui-page-active" id="smallProcessingPage"><div class="ui-content content-padding"><div class="small-processing-container"><div class="ui-processing"></div><div class="ui-processing-text"></div></div></div></div>');
		processingPage.appendTo("body");
	}
	
	var processingText=processingPage.find('.ui-processing-text');
	processingText.text(description);
}

function closeProcessing(){
	var processingPage=$("#smallProcessingPage");
	if(processingPage.length!=0){
		processingPage.remove();
	}
}

function setupPageTriggers(page){
	page.addEventListener("pageshow",function(){
		if(settingsUpdated){
			settingsUpdated=false;
			openhabSitemap=null;
			reloadMainPage();
		}
	});
}