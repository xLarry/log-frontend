angular
    .module('StoreApp')
    .controller('LogArchiveController', ['$http', '$scope', 'backend', 'Task', LogArchiveController]);

function LogArchiveController($http, $scope, backend, Task) {
	var vm = this;
	
	vm.data = 0;
	
	vm.tasks = [];
	
	vm.createTask = function() {
		console.log('createTask() triggered');
		
		backend.emit('createTask', '');
		vm.updateTasks();
	};
	
	vm.updateTasks = function() {
		vm.tasks = Task.query();
	};
	
	backend.on('statusUpdate', function(data) {
		console.log('Status update received: ' + data.percentage);
		
		$scope.$apply( function() {
				vm.data = data.percentage;
		});
	});
	
}