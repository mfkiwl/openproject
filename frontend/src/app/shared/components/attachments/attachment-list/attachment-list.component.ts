// -- copyright
// OpenProject is an open source project management software.
// Copyright (C) 2012-2022 the OpenProject GmbH
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See COPYRIGHT and LICENSE files for more details.
//++

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { filter } from 'rxjs/operators';
import { States } from 'core-app/core/states/states.service';
import { trackByHref } from 'core-app/shared/helpers/angular/tracking-functions';
import { HalResource } from 'core-app/features/hal/resources/hal-resource';
import { IAttachment } from 'core-app/core/state/attachments/attachment.model';
import { HalResourceService } from 'core-app/features/hal/services/hal-resource.service';
import { UntilDestroyedMixin } from 'core-app/shared/helpers/angular/until-destroyed.mixin';
import { AttachmentsResourceService } from 'core-app/core/state/attachments/attachments.service';

@Component({
  selector: 'op-attachment-list',
  templateUrl: './attachment-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentListComponent extends UntilDestroyedMixin implements OnInit, OnDestroy {
  @Input() public resource:HalResource;

  @Input() public destroyImmediately = true;

  trackByHref = trackByHref;

  attachments:IAttachment[] = [];

  deletedAttachments:IAttachment[] = [];

  public $element:JQuery;

  public $formElement:JQuery;

  private get attachmentsSelfLink():string {
    const attachments = this.resource.attachments as unknown&{ href:string };
    return attachments.href;
  }

  constructor(protected elementRef:ElementRef,
    protected states:States,
    protected cdRef:ChangeDetectorRef,
    protected attachmentsResourceService:AttachmentsResourceService,
    protected halResourceService:HalResourceService) {
    super();
  }

  ngOnInit():void {
    this.$element = jQuery<HTMLElement>(this.elementRef.nativeElement);

    this.updateAttachments();
    this.setupResourceUpdateListener();

    // if (!this.destroyImmediately) {
    //   this.setupAttachmentDeletionCallback();
    // }
  }

  public setupResourceUpdateListener():void {
    const resource = this.states.forResource(this.resource);
    if (!resource) return;

    resource
      .values$()
      .pipe(
        this.untilDestroyed(),
        filter((newResource) => !!newResource),
      )
      .subscribe((newResource:HalResource) => {
        this.resource = newResource || this.resource;

        this.updateAttachments();
        this.cdRef.detectChanges();
      });
  }

  ngOnDestroy():void {
    super.ngOnDestroy();
    if (!this.destroyImmediately) {
      this.$formElement.off('submit.attachment-component');
    }
  }

  public removeAttachment(attachment:IAttachment):void {
    this.deletedAttachments.push(attachment);
    // Keep the same object as we would otherwise loose the connection to the
    // resource's attachments array. That way, attachments added after removing one would not be displayed.
    // This is bad design.
    const newAttachments = this.attachments.filter((el) => el !== attachment);
    this.attachments.length = 0;
    this.attachments.push(...newAttachments);

    this.attachmentsResourceService.removeAttachment(this.attachmentsSelfLink, attachment)
      .subscribe(() => {
        this.updateAttachments();
      });
  }

  // private get attachmentsUpdatable() {
  //   return (this.resource.attachments && this.resource.attachmentsBackend);
  // }

  // public setupAttachmentDeletionCallback():void {
  //   this.$formElement = this.$element.closest('form');
  //   this.$formElement.on('submit.attachment-component', () => {
  //     this.destroyRemovedAttachments();
  //   });
  // }

  // private destroyRemovedAttachments() {
  //   this.deletedAttachments.forEach((attachment) => {
  //     this
  //       .resource
  //       .removeAttachment();
  //   });
  // }

  private updateAttachments() {
    // if (!this.attachmentsUpdatable) {
    //   this.attachments = this.resource.attachments.elements;
    //   return;
    // }

    this.attachmentsResourceService
      .fetchAttachments(this.attachmentsSelfLink)
      .subscribe((attachments) => {
        this.attachments = attachments._embedded.elements;
        this.cdRef.detectChanges();
      });

    // this
    //   .resource
    //   .attachments
    //   .updateElements()
    //   .then(() => {
    //     this.attachments = this.resource.attachments.elements;
    //     this.cdRef.detectChanges();
    //   });
  }
}
