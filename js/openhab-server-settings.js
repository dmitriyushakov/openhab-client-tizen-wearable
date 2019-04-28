var openedServerPageType=null;
var settingsUpdated=false;

function openServerSettingsPage(pageType){
	openedServerPageType=pageType;
	tau.changePage("server-settings.html");
}

function serverSettingsPageCallback(){
	var page=document.getElementById("server-settings");

	var saveSettings=function(){
		var config={
				address:$("#server-address").val(),
				username:$("#server-username").val(),
				password:$("#server-password").val()
		}
		
		var prevConfig=JSON.parse(localStorage.getItem(openedServerPageType))
		settingsUpdated=settingsUpdated||!prevConfig||(config.address!==prevConfig.address||config.username!==prevConfig.username||config.password!==prevConfig.password);
		
		config=JSON.stringify(config);
		localStorage.setItem(openedServerPageType,config);
	}
	
	var loadSettings=function(){
		var config=localStorage.getItem(openedServerPageType);
		
		if(config!=null){
			config=JSON.parse(config);
			$("#server-address").val(config.address);
			$("#server-username").val(config.username);
			$("#server-password").val(config.password);
		}
		
		if(openedServerPageType=="local-server-settings"){
			$("#server-settings .ui-title").text(getLocaleString("local_server","Local server"));
		}else if(openedServerPageType=="remote-server-settings"){
			$("#server-settings .ui-title").text(getLocaleString("remote_server","Remote server"));
		}
	}
	
	var unbindListeners=function(){
		page.removeEventListener("pagebeforeshow", pageShowListener);
		page.removeEventListener("pagehide", pageHideListener);
	}
	
	var pageShowListener=function(){
		loadSettings();
	}
	
	var pageHideListener=function(){
		saveSettings();
		unbindListeners();
	}
	
	function translateLabel(selector,key){
		var localeString=LANG_JSON_DATA[key];
		if(localStorage){
			var labelWgt=$(page).find(selector);
			labelWgt.text(localeString);
		}
	}

	translateLabel("label[for='server-address']","server_address");
	translateLabel("label[for='server-username']","username");
	translateLabel("label[for='server-password']","password");
	
	page.addEventListener("pagebeforeshow", pageShowListener)
	page.addEventListener("pagehide", pageHideListener)
}

function settingsPageCallback(){
	var page=document.getElementById("settings-page");
	var linksInitialized=false;
	
	var unbindListeners=function(){
		page.removeEventListener("pagebeforeshow", pageShowListener);
		page.removeEventListener("pagebeforehide", pageHideListener);
	}
	
	var pageShowListener=function(){
		setupListeners();
	}
	
	var setupListeners=function(){
		if(!linksInitialized){
			$("#local-server-link").click(function(){openServerSettingsPage("local-server-settings")});
			$("#remote-server-link").click(function(){openServerSettingsPage("remote-server-settings")});
			$("#show-sitemaps-link").click(openSitemapsListPage);
			
			linksInitialized=true;
		}
	}
	
	var pageHideListener=function(){
		unbindListeners();
	}
	
	function translateLabel(selector,key){
		var localeString=LANG_JSON_DATA[key];
		if(localStorage){
			var labelWgt=$(page).find(selector);
			labelWgt.text(localeString);
		}
	}

	translateLabel("#local-server-link","local_server");
	translateLabel("#remote-server-link","remote_server");
	translateLabel("#show-sitemaps-link","sitemap");
	translateLabel(".ui-title","settings");
	
	page.addEventListener("pagebeforeshow", pageShowListener)
	page.addEventListener("pageafterhide", pageHideListener)
}



function openSitemapsListPage(){
	var wgt=null;
	
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
				if(radio.val()!==localStorage.getItem("sitemap")){
					settingsUpdated=true;
					localStorage.setItem("sitemap",radio.val());
				}
			}
		};
	
		page.addEventListener("pagebeforeshow", pageBeforeShowHandler);
		page.addEventListener("pagehide", pageHideHandler);
	}
	
	var configurationIndex=0;
	
	function tryRequestSitemaps(){
		if(configurationIndex==configUsageOrder.length){
			closeProcessing();
			alert(getLocaleString("unable_to_load_sitemaps","Unable to load sitemaps!"));
		}else{
			var config=JSON.parse(localStorage.getItem(configUsageOrder[configurationIndex].configName));
			
			if(config==null){
				configurationIndex++;
				tryRequestSitemaps();
			}else{
				showProcessing(configUsageOrder[configurationIndex].sitemapWaitMessage());
				$.ajax({
					url:getServerAddress(config.address)+"/rest/sitemaps",
					dataType:"json",
					method:"GET",
					username:(config.username===""?null:config.username),
					password:(config.password===""?null:config.password)
				})
				.done(function(data){
					closeProcessing();
					
					wgt={label:getLocaleString("sitemaps","Sitemaps"),mappings:[],item:{state:localStorage.getItem("sitemap")}};
					
					for(var i=0;i<data.length;i++){
						wgt.mappings[wgt.mappings.length]={label:data[i].label,command:data[i].name};
					}
					
					tau.changePage("multibutton-radio.html");
				}).fail(function(){
					configurationIndex++;
					tryRequestSitemaps();
				});
			}
		}
	}
	
	tryRequestSitemaps();
}