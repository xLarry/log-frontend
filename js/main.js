angular
    .module('StoreApp', ['ngRoute', 'archiveService'])
    .config(config);

function config($provide, $routeProvider, $locationProvider) {
	
	var globalConfig = {
		
	};
	
	var backend = io.connect('http://localhost:1337');
	
	$provide.value('globalConfig', globalConfig);
	
	$provide.value('backend', backend);
	
    $routeProvider
		.when('/', {
				templateUrl: 'views/status.html'
		})
		.when('/status', {
            templateUrl: 'views/status.html',
            controller: 'AppController',
            controllerAs: 'app'
        })
		.when('/log-files/archive', {
			templateUrl: 'views/log-files/archive.html'
			, controller: 'LogArchiveController'
			, controllerAs: 'archive'
		})
		.when('/log-files/parse', {
            templateUrl: 'views/log-files/parse.html',
            // controller: 'LogParser',
            // controllerAs: 'parser'
        })
		// .otherwise({
			// redirectTo: '/status'
		// })
		;
	
	// use the HTML5 History API
	$locationProvider.html5Mode(true);
}