angular
    .module('StoreApp')
    .controller('LogArchiveController', ['$http', '$scope', 'backend', LogArchiveController]);

function LogArchiveController($http, $scope, backend) {
	var vm = this;
	
	vm.data = 0;
	
	vm.tasks = [];
	
	vm.createTask = function() {
		console.log('createTask() triggered');
		
		backend.emit('createTask', '')
		vm.updateTasks();
	}
	
	vm.updateTasks = function() {
		$http.get('/api/log-files/task').then( (data) => {
			console.log(data);
			vm.tasks = data;
		});
	}
	
	backend.on('statusUpdate', (data) => {
		console.log('Status update received: ' + data.percentage);
		
		$scope.$apply( function() {
				vm.data = data.percentage;
		});
	});
	
}