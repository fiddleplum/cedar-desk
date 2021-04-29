import { Page } from 'page';
import { ShowHide, ElmForm } from 'elm-app';
import { RandomString } from 'pine-lib';
import { SunAlarm } from 'types/sun-alarm';

export class SunAlarmAddEditPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Sun Alarm');

		this._alarmId = this.app.router.getValue('id');
		if (this._alarmId !== undefined) {
			this.query('.title', Element).innerHTML = 'Edit Alarm';
			this.query('.submit', Element).innerHTML = 'Update Alarm';

			// this.element('form', HTMLElement).classList.add('hidden');
			// Fill in the inputs.
			this.app.ws.send({
				module: 'sun-alarm',
				command: 'get',
				params: {
					id: this._alarmId
				}
			}).then((sunAlarm: SunAlarm) => {
				// Gather the form values from the class.
				const formValues: Map<string, string | boolean> = new Map();
				formValues.set('relativeTo', sunAlarm.relativeTo);
				formValues.set('angleOffset', `${Math.abs(sunAlarm.angleOffset)}`);
				formValues.set('angleSign', sunAlarm.angleOffset > 0 ? 'above' : 'below');
				formValues.set('timeOffset', `${Math.floor(Math.abs(sunAlarm.timeOffset) / 60)}`.padStart(2, '0') + ':' + `${Math.abs(sunAlarm.timeOffset) % 60}`.padStart(2, '0'));
				formValues.set('timeSign', sunAlarm.timeOffset > 0 ? 'after' : 'before');
				formValues.set('sound', sunAlarm.sound);
				for (let i = 0; i < 7; i++) {
					formValues.set(`day${i}`, sunAlarm.days[i]);
				}
				// Set the values of the form.
				this.component('form', ElmForm).setValues(formValues);
				// Enable everything once we get the result.
				this.component('form', ElmForm).setEnabled(true);
				// this.element('form', HTMLElement).classList.remove('hidden');
			});
		}
		else {
			// Enable the form immediately.
			this.component('form', ElmForm).setEnabled(true);
		}
	}

	private _toggleAngleHelp(): void {
		ShowHide.toggle(this.root.querySelector('#angle-help') as HTMLElement);
	}

	private _submit(): void {
		const inputs = this.component('form', ElmForm).getValues();
		console.log(inputs);

		// Get the angle offset.
		let angleOffset: number = 0;
		try {
			angleOffset = Number.parseFloat(inputs.get('angleOffset') as string);
		}
		catch {
			this.query('.message', Element).innerHTML = 'The angle offset must be a number.';
			return;
		}
		if (inputs.get('angleSign') === 'below') {
			angleOffset *= -1;
		}

		// Get the time offset.
		let timeOffset: number = 0;
		try {
			const hours = Number.parseInt((inputs.get('timeOffset') as string).substring(0, 2));
			const minutes = Number.parseInt((inputs.get('timeOffset') as string).substring(3, 5));
			timeOffset = hours * 60 + minutes;
		}
		catch {
			this.query('.message', Element).innerHTML = 'The time offset must in the format HH:MM.';
			return;
		}
		if (inputs.get('timeSign') === 'before') {
			timeOffset *= -1;
		}

		// Get the days of the week.
		const days: boolean[] = [];
		for (let i = 0; i < 7; i++) {
			days.push(inputs.get(`day${i}`) as boolean);
		}

		// Add the alarm.
		this.app.ws.send({
			module: 'sun-alarm',
			command: 'update',
			params: {
				id: this._alarmId ?? RandomString.generate(12),
				relativeTo: inputs.get('relativeTo'),
				angleOffset: angleOffset,
				timeOffset: timeOffset,
				sound: inputs.get('sound'),
				days: days,
				enabled: true
			}
		}).then(() => {
			this._goToAlarmList();
		});
	}

	private _goToAlarmList(): void {
		this.app.router.pushQuery({
			page: 'sun-alarm'
		});
	}

	private _alarmId: string | undefined = undefined;
}

SunAlarmAddEditPage.html = /* html */`
	<div>
		<button onclick="_goToAlarmList" style="float: right">Back</button>
		<h1 class="title">Add Alarm</h1>
		<ElmForm id="form">
			<p>Should the time of the alarm be relative to sunrise or sunset?</p>
			<entry name="relativeTo" type="choice" value="sunrise" width="8rem">
				<choice value="sunrise">Sunrise</choice>
				<choice value="sunset">Sunset</choice>
			</entry>
			<p>At what angle above or below the horizon (degrees)?</p>
			<entry name="angleOffset" type="text" value="0" width="3rem"></entry>
			<entry name="angleSign" type="dropdown" value="below" width="8rem">
				<choice value="below">below</choice>
				<choice value="above">above</choice>
			</entry>
			<elmcheckbox id="angle-help-button" ontoggle="_toggleAngleHelp">?</elmcheckbox>
			<div class="angle-help" class="popup2" style="display: none;">
				<p>When the sun is right at the horizon, it is at 0 degrees.</p>
				<p>Use negative numbers for angles below the horizon and positive numbers for angles above the horizon.</p>
				<p><img src="assets/images/angle-help.svg"></img></p>
				<p style="font-size: .5rem;">Courtesy Wikipedia</p>
			</div>
			<p>How much time before or after the sun reaches this angle (HH:MM)?</p>
			<entry name="timeOffset" type="text" width="6rem" value="00:00"></entry>
				<!--<input name="timeOffset" style="width: 6rem;" value="00:00" />-->
			<entry name="timeSign" type="dropdown" value="before" width="8rem">
				<choice value="before">before</choice>
				<choice value="after">after</choice>
			</entry>
			<p>Choose an alarm:</p>
			<entry name="sound" type="dropdown" value="beep" width="8rem">
				<choice value="beep">Beep</choice>
				<choice value="rooster">Rooster Crow</choice>
				<choice value="lulluby">Lulluby</choice>
			</entry>
			<p>On what days should it happen?</p>
				<entry name="day0" type="toggle" value="true">M</entry>
				<entry name="day1" type="toggle" value="true">T</entry>
				<entry name="day2" type="toggle" value="true">W</entry>
				<entry name="day3" type="toggle" value="true">T</entry>
				<entry name="day4" type="toggle" value="true">F</entry>
				<entry name="day5" type="toggle">S</entry>
				<entry name="day6" type="toggle">S</entry>
			</p>
		</ElmForm>
		<p><button class="submit" onclick="_submit" class="submit">Add</button></p>
		<p class="message"></p>
	</div>
	`;

SunAlarmAddEditPage.css = /* css */`
	.SunAlarmAddEditPage {
		margin: 0 auto;
		width: 100%;
		max-width: 20rem;
	}
	.SunAlarmAddEditPage .days label {
		width: 1.5rem;
		text-align: center;
		padding: 0;
	}
`;

SunAlarmAddEditPage.register();
