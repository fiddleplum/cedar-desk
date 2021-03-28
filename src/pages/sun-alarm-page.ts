import { Cookies } from 'elm-app';
import { Page } from 'page';

export class SunAlarmPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Sun Alarm');

		// Get the tasks.
		this.app.ws.send({
			command: 'list',
			table: `sun_alarm/${Cookies.get('user')}`,
			filter: []
		}).then((response) => {
			console.log(response);
		});
	}
}

SunAlarmPage.html = /* html */`
	<div>
	</div>
	`;

SunAlarmPage.css = /* css */`
	label {
		display: inline-block;
		width: 5em;
	}
	input {
		display: inline-block;
		width: 6em;
	}
	`;

SunAlarmPage.register();
