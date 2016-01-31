angular
    .module('StoreApp')
    .controller('LogArchiveController', ['$filter', '$http', '$scope', 'backend', 'Task', LogArchiveController]);

function LogArchiveController($filter, $http, $scope, backend, Task) {
	var vm = this;
	
	vm.data = 0;
	
	vm.tasks = Task.query();
	
	vm.createTask = function() {
		console.log('createTask() triggered');
		
		Task.create();
	}
	
	vm.updateTasks = function() {
		vm.tasks = Task.query();
	}
	
	backend.on('taskCreated', (newTask) => {
		console.log('taskCreated event received');
		
		vm.tasks.push(newTask);
	});
	
	backend.on('progressUpdate', (data) => {
		console.log('Progress update received for ' + data.taskId);
		
		$scope.$apply( function() {
			$filter('filter')(vm.tasks, {id: data.taskId})[0].progress = data.progress.percentage;
		});
	});
	
	backend.on('statusUpdate', (data) => {
		console.log('Status update received for ' + data.id);
		
		$scope.$apply( function() {
			$filter('filter')(vm.tasks, {id: data.taskId})[0].status = data.status;
		});
	});
	
}