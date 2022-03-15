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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { applyTransaction, QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AttachmentsStore } from 'core-app/core/state/attachments/attacments.store';
import { IAttachment } from 'core-app/core/state/attachments/attachment.model';
import { IHALCollection } from 'core-app/core/apiv3/types/hal-collection.type';
import { ToastService } from 'core-app/shared/components/toaster/toast.service';

@Injectable()
export class AttachmentsResourceService {
  protected store = new AttachmentsStore();

  public query = new QueryEntity(this.store);

  constructor(
    private http:HttpClient,
    private toastService:ToastService,
  ) { }

  /**
   * Fetches attachments by the attachment collection self link.
   * This link is used as key to store the result collection in the resource store.
   *
   * @param attachmentsSelfLink The self link of the attachment collection from the parent resource.
   */
  fetchAttachments(attachmentsSelfLink:string):Observable<IHALCollection<IAttachment>> {
    return this.http
      .get<IHALCollection<IAttachment>>(attachmentsSelfLink)
      .pipe(
        tap((events) => {
          applyTransaction(() => {
            this.store.upsertMany(events._embedded.elements);
            this.store.update(({ collections }) => (
              {
                collections: {
                  ...collections,
                  [attachmentsSelfLink]: {
                    ids: events._embedded.elements.map((el) => el.id),
                  },
                },
              }
            ));
          });
        }),
        catchError((error) => {
          this.toastService.addError(error);
          throw error;
        }),
      );
  }

  /**
   * Sends deletion request and invalidates store collection of attachments.
   *
   * @param attachmentsSelfLink The identifier of the current attachment collection.
   * @param attachment The attachment to be deleted.
   */
  removeAttachment(attachmentsSelfLink:string, attachment:IAttachment):Observable<void> {
    return this.http
      .delete<void>(attachment._links.delete.href, { withCredentials: true, headers: { 'content-type': 'application/json' } })
      .pipe(
        tap(() => {
          applyTransaction(() => {
            this.store.remove(attachment.id);
            this.store.update(({ collections }) => (
              {
                collections: {
                  ...collections,
                  [attachmentsSelfLink]: undefined,
                },
              }
            ));
          });
        }),
        catchError((error) => {
          this.toastService.addError(error);
          throw error;
        }),
      );
  }
}
