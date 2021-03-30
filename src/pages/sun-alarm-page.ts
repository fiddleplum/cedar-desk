import { Page } from 'page';
import { ElmForm } from 'elm-app';

export class SunAlarmPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Sun Alarm');

		// Get the alarms.
		this.app.ws.send({
			module: 'sun-alarm',
			command: 'list'
		}).then((response) => {
			console.log(response);
		});
	}
}

SunAlarmPage.html = /* html */`
	<div>
		<p><button id="add-alarm">Add Alarm</button></p>
		<ElmForm labelWidth="5rem">
			// <entry name="
		</ElmForm>
		<div id="add-alarm-page">

		</div>
	</div>
	`;

SunAlarmPage.css = /* css */`
	.SunAlarmPage #add-alarm {
		width: 100%;
	}
	`;

SunAlarmPage.register();
