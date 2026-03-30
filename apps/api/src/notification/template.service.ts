import { Injectable } from '@nestjs/common';
import * as ejs from 'ejs';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class TemplateService {
    async renderTemplate(templateName: string, data: Record<string, any> = {}): Promise<string> {
        // In dev (ts-node): __dirname = .../src/notification, templates/ is a direct child.
        // In prod (webpack): the bundle lands in dist/apps/api/, assets land in
        //   dist/apps/api/notification/templates/ — so we need the extra prefix.
        const devPath  = path.join(__dirname, 'templates', `${templateName}.ejs`);
        const prodPath = path.join(__dirname, 'notification', 'templates', `${templateName}.ejs`);
        const templatePath = fs.existsSync(devPath) ? devPath : prodPath;
        const template = fs.readFileSync(templatePath, 'utf8');
        return ejs.render(template, data);
    }
}
