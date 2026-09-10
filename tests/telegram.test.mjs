import test from 'node:test';
import assert from 'node:assert/strict';
import {formatOpportunityFound,formatLossMessage,telegramPreference} from '../vps-backend/utils/telegramTemplates.js';
test('telegram signal template escapes external values and does not invent accuracy',()=>{const text=formatOpportunityFound('<R>','A&B','CALL',100,.35,'12:00');assert.ok(text.includes('&lt;R&gt;'));assert.ok(text.includes('A&amp;B'));assert.ok(!text.includes('88.5'));assert.ok(!text.includes('100.0%'));});
test('telegram preferences apply to order, opportunity and session events',()=>{assert.equal(telegramPreference('order_executed',{telegramNotifOrder:false}),false);assert.equal(telegramPreference('opportunity',{telegramNotifOpportunity:false}),false);assert.equal(telegramPreference('bot_started',{telegramNotifBotStarted:false}),false);assert.equal(telegramPreference('win',{}),true);assert.ok(formatLossMessage(-.35,100,2,.74).includes('G2'));});
