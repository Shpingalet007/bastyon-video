"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("mocha");
const chai = tslib_1.__importStar(require("chai"));
const extra_utils_1 = require("@shared/extra-utils");
const models_1 = require("@shared/models");
const expect = chai.expect;
describe('Test contact form', function () {
    let server;
    const emails = [];
    let command;
    before(function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.timeout(30000);
            const port = yield extra_utils_1.MockSmtpServer.Instance.collectEmails(emails);
            const overrideConfig = {
                smtp: {
                    hostname: 'localhost',
                    port
                }
            };
            server = yield extra_utils_1.createSingleServer(1, overrideConfig);
            yield extra_utils_1.setAccessTokensToServers([server]);
            command = server.contactForm;
        });
    });
    it('Should send a contact form', function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.timeout(10000);
            yield command.send({
                fromEmail: 'toto@example.com',
                body: 'my super message',
                subject: 'my subject',
                fromName: 'Super toto'
            });
            yield extra_utils_1.waitJobs(server);
            expect(emails).to.have.lengthOf(1);
            const email = emails[0];
            expect(email['from'][0]['address']).equal('test-admin@localhost');
            expect(email['replyTo'][0]['address']).equal('toto@example.com');
            expect(email['to'][0]['address']).equal('admin' + server.internalServerNumber + '@example.com');
            expect(email['subject']).contains('my subject');
            expect(email['text']).contains('my super message');
        });
    });
    it('Should not be able to send another contact form because of the anti spam checker', function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.timeout(10000);
            yield extra_utils_1.wait(1000);
            yield command.send({
                fromEmail: 'toto@example.com',
                body: 'my super message',
                subject: 'my subject',
                fromName: 'Super toto'
            });
            yield command.send({
                fromEmail: 'toto@example.com',
                body: 'my super message',
                fromName: 'Super toto',
                subject: 'my subject',
                expectedStatus: models_1.HttpStatusCode.FORBIDDEN_403
            });
        });
    });
    it('Should be able to send another contact form after a while', function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield extra_utils_1.wait(1000);
            yield command.send({
                fromEmail: 'toto@example.com',
                fromName: 'Super toto',
                subject: 'my subject',
                body: 'my super message'
            });
        });
    });
    it('Should not have the manage preferences link in the email', function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const email = emails[0];
            expect(email['text']).to.not.contain('Manage your notification preferences');
        });
    });
    after(function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            extra_utils_1.MockSmtpServer.Instance.kill();
            yield extra_utils_1.cleanupTests([server]);
        });
    });
});
