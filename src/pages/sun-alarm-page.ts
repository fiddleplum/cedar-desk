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
		<ElmForm id="form" labelWidth="8rem">
			<entry name="relativeTo" label="Sunrise or Sunset" type="choice">
				<choice value="sunrise">Sunrise</choice>
				<choice value="sunset">Sunset</choice>
			</entry>
			<entry name="degreesOffset" label="Degrees Offset" type="text"></entry>
			<entry name="secondsOffset" label="Seconds Offset" type="text"></entry>
			<entry name="sound" label="Sound" type="choice">
				<choice value="beep">Beep</choice>
				<choice value="chicken">Chicken</choice>
				<choice value="good-night">Good Night</choice>
			</entry>
			<entry name="daysOfWeek" label="Days Of The Week" type="multichoice">
				<choice value="0">Monday</choice>
				<choice value="1">Tuesday</choice>
				<choice value="2">Wednesday</choice>
				<choice value="3">Thursday</choice>
				<choice value="4">Friday</choice>
				<choice value="5">Saturday</choice>
				<choice value="6">Sunday</choice>
			</entry>
			<entry name="enabled" label="Enabled" type="choice">
				<choice value="1">On</choice>
				<choice value="0">Off</choice>
			</entry>
		</ElmForm>
		<div id="add-alarm-page">

		</div>
	</div>
	`;

SunAlarmPage.css = /* css */`
	.SunAlarmPage {
		margin: 0 auto;
		width: 100%;
		max-width: 20rem;
	}
	.SunAlarmPage #add-alarm {
		width: 100%;
	}
	.SunAlarmPage #form {
		margin-top: .5rem;
	}
`;

SunAlarmPage.register();
