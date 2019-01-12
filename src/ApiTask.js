const chalk = require('chalk');

const Task = require('./Task');

class ApiTask extends Task {

	static getDateTime(timestamp) {
		const date = new Date(timestamp);

		const hour = date.getHours().toString().padStart(2, '0');
		const min  = date.getMinutes().toString().padStart(2, '0');
		const sec  = date.getSeconds().toString().padStart(2, '0');

		return `${hour}:${min}:${sec}`;
	}

	startPollingEvents(stackId = null) {
		const { stack } = this.options;

		this.events = {};

		this.pollParams = { StackName: stackId || stack.name };
		this.pollInterval = setInterval(this.pollStackEvents.bind(this), 2500);

		this.log.info(chalk.white.bold('Event Logs:'));
	}

	stopPollingEvents() {
		clearInterval(this.pollInterval);
		this.log.info('');
	}

	pollStackEvents() {
		this.cloudformation.describeStackEvents(this.pollParams, (err, data) => {
			if (!err) {
				data.StackEvents.reverse().forEach(this.displayEvent.bind(this));
			}
		});
	}

	displayEvent(event) {
		const { EventId, ClientRequestToken, Timestamp, LogicalResourceId, ResourceStatus, ResourceStatusReason } = event;

		if (ClientRequestToken === this.taskUUID && !this.events[EventId]) {
			this.events[EventId] = true;

			let status = (ResourceStatus || '').padEnd(50, ' ');
			switch (ResourceStatus) {
				case 'CREATE_COMPLETE':
				case 'UPDATE_COMPLETE':
				case 'DELETE_COMPLETE':
				case 'UPDATE_ROLLBACK_COMPLETE':
					status = chalk.green.bold(status);
					break;
				case 'CREATE_FAILED':
				case 'UPDATE_FAILED':
				case 'DELETE_FAILED':
				case 'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS':
				case 'UPDATE_ROLLBACK_IN_PROGRESS':
				case 'ROLLBACK_FAILED':
					status = chalk.red.bold(status);
					break;
				default:
					status = chalk.gray.bold(status);
					break;
			}

			const message = [
				`[${ApiTask.getDateTime(Timestamp)}]`,
				(LogicalResourceId || '').padEnd(30, ' '),
				status,
				ResourceStatusReason || chalk.gray('—'),
			];

			this.log.info(message.join(' '));
		}
	}

}

module.exports = ApiTask;
