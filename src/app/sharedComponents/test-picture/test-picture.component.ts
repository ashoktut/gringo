import { Component } from '@angular/core';
import { PictureUploadComponent } from '../picture-upload/picture-upload.component';

@Component({
  selector: 'app-test-picture',
  standalone: true,
  imports: [PictureUploadComponent],
  template: `
    <div>
      <h2>Picture Upload Test</h2>
      <app-picture-upload
        placeholder="Test Upload"
        [maxFileSize]="5242880"
        [acceptedTypes]="['image/jpeg', 'image/png']">
      </app-picture-upload>
    </div>
  `
})
export class TestPictureComponent {
}
