import { Observable } from 'rxjs'
import { catchError, map, switchMap } from 'rxjs/operators'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { ComponentPaginationLight, RestExtractor, RestPagination, RestService } from '@app/core'
import { Video, VideoChannel, VideoChannelService, VideoService } from '@app/shared/shared-main'
import { peertubeLocalStorage } from '@root-helpers/peertube-web-storage'
import {
  ResultList,
  Video as VideoServerModel,
  VideoChannel as VideoChannelServerModel,
  VideoPlaylist as VideoPlaylistServerModel
} from '@shared/models'
import { environment } from '../../../environments/environment'
import { VideoPlaylist, VideoPlaylistService } from '../shared-video-playlist'
import { AdvancedSearch } from './advanced-search.model'

@Injectable()
export class SearchService {
  static BASE_SEARCH_URL = environment.apiUrl + '/api/v1/search/'

  constructor (
    private authHttp: HttpClient,
    private restExtractor: RestExtractor,
    private restService: RestService,
    private videoService: VideoService,
    private playlistService: VideoPlaylistService
  ) {
    // Add ability to override search endpoint if the user updated this local storage key
    const searchUrl = peertubeLocalStorage.getItem('search-url')
    if (searchUrl) SearchService.BASE_SEARCH_URL = searchUrl
  }

  searchVideos (parameters: {
    search?: string
    componentPagination?: ComponentPaginationLight
    advancedSearch?: AdvancedSearch
    uuids?: string[]
  }): Observable<ResultList<Video>> {
    const { search, uuids, componentPagination, advancedSearch } = parameters

    const url = SearchService.BASE_SEARCH_URL + 'videos'
    let pagination: RestPagination

    if (componentPagination) {
      pagination = this.restService.componentPaginationToRestPagination(componentPagination)
    }

    let params = new HttpParams()
    params = this.restService.addRestGetParams(params, pagination)

    if (search) params = params.append('search', search)
    if (uuids) params = this.restService.addArrayParams(params, 'uuids', uuids)

    if (advancedSearch) {
      const advancedSearchObject = advancedSearch.toVideosAPIObject()
      params = this.restService.addObjectParams(params, advancedSearchObject)
    }

    return this.authHttp
               .get<ResultList<VideoServerModel>>(url, { params })
               .pipe(
                 switchMap(res => this.videoService.extractVideos(res)),
                 catchError(err => this.restExtractor.handleError(err))
               )
  }

  searchVideoChannels (parameters: {
    search?: string
    advancedSearch?: AdvancedSearch
    componentPagination?: ComponentPaginationLight
    handles?: string[]
  }): Observable<ResultList<VideoChannel>> {
    const { search, advancedSearch, componentPagination, handles } = parameters

    const url = SearchService.BASE_SEARCH_URL + 'video-channels'

    let pagination: RestPagination
    if (componentPagination) {
      pagination = this.restService.componentPaginationToRestPagination(componentPagination)
    }

    let params = new HttpParams()
    params = this.restService.addRestGetParams(params, pagination)

    if (search) params = params.append('search', search)
    if (handles) params = this.restService.addArrayParams(params, 'handles', handles)

    if (advancedSearch) {
      const advancedSearchObject = advancedSearch.toChannelAPIObject()
      params = this.restService.addObjectParams(params, advancedSearchObject)
    }

    return this.authHttp
               .get<ResultList<VideoChannelServerModel>>(url, { params })
               .pipe(
                 map(res => VideoChannelService.extractVideoChannels(res)),
                 catchError(err => this.restExtractor.handleError(err))
               )
  }

  searchVideoPlaylists (parameters: {
    search?: string
    advancedSearch?: AdvancedSearch
    componentPagination?: ComponentPaginationLight
    uuids?: string[]
  }): Observable<ResultList<VideoPlaylist>> {
    const { search, advancedSearch, componentPagination, uuids } = parameters

    const url = SearchService.BASE_SEARCH_URL + 'video-playlists'

    let pagination: RestPagination
    if (componentPagination) {
      pagination = this.restService.componentPaginationToRestPagination(componentPagination)
    }

    let params = new HttpParams()
    params = this.restService.addRestGetParams(params, pagination)

    if (search) params = params.append('search', search)
    if (uuids) params = this.restService.addArrayParams(params, 'uuids', uuids)

    if (advancedSearch) {
      const advancedSearchObject = advancedSearch.toPlaylistAPIObject()
      params = this.restService.addObjectParams(params, advancedSearchObject)
    }

    return this.authHttp
               .get<ResultList<VideoPlaylistServerModel>>(url, { params })
               .pipe(
                 switchMap(res => this.playlistService.extractPlaylists(res)),
                 catchError(err => this.restExtractor.handleError(err))
               )
  }
}
