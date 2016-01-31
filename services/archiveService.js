angular
	.module('archiveService', ['ngResource'])
	.factory('Task', ['$resource', Task])
	
function Task($resource) {
	return $resource('api/log-files/tasks/:taskId', {}, {
		query: {method:'GET', isArray: true}
		, create: {method: 'PUT'}
	});
};