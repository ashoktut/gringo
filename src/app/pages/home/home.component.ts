import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatAccordion, MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatDivider, MatNavList } from '@angular/material/list';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [
    MatAccordion,
    MatExpansionPanel,
    MatExpansionModule,
    MatIconModule,
    MatNavList,
    MatDivider,
    CommonModule,
    RouterModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  panelOpenState: boolean = false;
  list = [
  {
    "formID": "1",
    "formName": "Request for Quote (RFQ)",
    "routePath": "/rfq"
  },
  {
    "formID": "2",
    "formName": "Request for Re-Quote (RQR)",
    "routePath": "/rqr"
  }
]

trackLink(index: number, item: any) {
  return item.formID;
}

}
