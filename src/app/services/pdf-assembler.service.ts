import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PdfAssemblerService {
  constructor(private http: HttpClient) {}

  /**
   * Loads the HTML template and CSS, injects the CSS, replaces placeholders with data, and returns the final HTML string.
   * @param contentHtml The HTML content to inject (e.g., from Mammoth or your form data)
   * @param dataObj An object with keys matching the placeholders in the template (e.g., { repName: 'John', ... })
   */
  async assemblePdfHtml(contentHtml: string, dataObj: Record<string, any>): Promise<string> {
    // Format createdAt if present
    if (dataObj['createdAt']) {
      dataObj['createdAt'] = this.formatTimestamp(new Date(dataObj['createdAt']));
    }
    // Load template and CSS from assets
    const [template, css] = await Promise.all([
      firstValueFrom(this.http.get('assets/pdf-template.html', { responseType: 'text' })),
      firstValueFrom(this.http.get('assets/pdf-styles.css', { responseType: 'text' })),
    ]);

    // Inject CSS into <style> tag in the <head> of the template
    let styledTemplate = template.replace(
      '</head>',
      `<style>${css}</style></head>`
    );

    // Replace {{CONTENT}} placeholder with your generated content
    styledTemplate = styledTemplate.replace('{{CONTENT}}', contentHtml);

    // Replace all other {{placeholders}} with values from dataObj
    styledTemplate = styledTemplate.replace(/{{(\w+)}}/g, (match, key) => {
      return dataObj[key] !== undefined ? dataObj[key] : '';
    });

    return styledTemplate;
  }

  /**
   * Formats a Date object as 'YYYY-MM-DD HH:mm:ss ±HH:MM'
   */
  private formatTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const min = pad(date.getMinutes());
    const sec = pad(date.getSeconds());
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const offsetHours = pad(Math.floor(absOffset / 60));
    const offsetMinutes = pad(absOffset % 60);
    return `${year}-${month}-${day} ${hour}:${min}:${sec} ${sign}${offsetHours}:${offsetMinutes}`;
  }
}
