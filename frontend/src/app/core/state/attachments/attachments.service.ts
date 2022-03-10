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
import { AttachmentsStore } from 'core-app/core/state/attachments/attacments.store';
import { IHALCollection } from 'core-app/core/apiv3/types/hal-collection.type';
import { IAttachment } from 'core-app/core/state/attachments/attachment.model';
import { HttpClient } from '@angular/common/http';
import { ApiV3Service } from 'core-app/core/apiv3/api-v3.service';
import { ToastService } from 'core-app/shared/components/toaster/toast.service';
import { catchError, tap } from 'rxjs/operators';
import { applyTransaction } from '@datorama/akita';
import { Observable } from 'rxjs';

@Injectable()
export class AttachmentsResourceService {
  protected store = new AttachmentsStore();

  constructor(
    private http:HttpClient,
    private apiV3Service:ApiV3Service,
    private toastService:ToastService,
  ) { }

  // TODO: change to 'storeWorkPackageAttachments', call it when work package is fetched.
  fetchWorkPackageAttachments(workPackageId:number):Observable<IHALCollection<IAttachment>> {
    return this.http
      .get<IHALCollection<IAttachment>>(this.attachmentsPath(workPackageId))
      .pipe(
        tap((events) => {
          applyTransaction(() => {
            this.store.add(events._embedded.elements);
            // this.store.update(({ collections }) => {
            //
            // });
          });
        }),
        catchError((error) => {
          this.toastService.addError(error);
          throw error;
        }),
      );
  }

  private attachmentsPath(workPackageId:number):string {
    return `${this.apiV3Service.work_packages.path}/${workPackageId}/attachments`;
  }
}
