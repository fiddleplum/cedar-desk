import { Page } from 'page';

export class TasksPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Cedar Tasks');

		// Get the tasks.
		this.app.ws.send({
			command: 'list',
			table: 'tasks',
			filter: []
		}).then((response) => {
			console.log(response);
		});
	}
}

TasksPage.html = /* html */`
	<div>
	</div>
	`;

TasksPage.css = /* css */`
	label {
		display: inline-block;
		width: 5em;
	}
	input {
		display: inline-block;
		width: 6em;
	}
	`;

TasksPage.register();
