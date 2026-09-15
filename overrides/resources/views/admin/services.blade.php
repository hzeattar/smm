@extends('layouts.admin')

@section('content')
<style>
    .yd-services-table-wrap {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .yd-services-pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding: 14px 2px 2px;
        border-top: 1px solid #eef0f3;
    }

    .yd-services-pager .yd-services-pagination {
        flex: 1 1 440px;
        min-width: 0;
        display: flex;
        justify-content: center;
    }

    .yd-services-pager .pagination {
        margin: 0 !important;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
    }

    .yd-services-pager .page-item {
        margin: 0 !important;
    }

    .yd-services-pager .page-link {
        min-width: 40px;
        height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px !important;
        border: 1px solid #e1e5eb;
        color: #343a45;
        font-weight: 800;
        box-shadow: none !important;
    }

    .yd-services-pager .page-item.active .page-link {
        background: #f7c51e !important;
        border-color: #f7c51e !important;
        color: #17191f !important;
    }

    .yd-services-pager .page-item.disabled .page-link {
        opacity: .45;
        cursor: not-allowed;
        background: #f5f6f8;
    }

    .yd-services-pager-jump {
        flex: 0 1 auto;
        display: flex;
        align-items: center;
        gap: 7px;
        white-space: nowrap;
    }

    .yd-services-pager-jump label {
        margin: 0;
        color: #68707e;
        font-size: 12px;
        font-weight: 800;
    }

    .yd-services-pager-jump input {
        width: 82px;
        min-height: 40px;
        border: 1px solid #dfe2e7;
        border-radius: 8px;
        padding: 6px 9px;
        text-align: center;
        background: #fff;
    }

    .yd-services-pager-jump button {
        min-height: 40px;
        border: 0;
        border-radius: 8px;
        padding: 0 13px;
        background: #17191f;
        color: #fff;
        font-weight: 800;
        cursor: pointer;
    }

    .yd-services-pager-meta {
        flex: 0 0 100%;
        text-align: center;
        color: #7a828f;
        font-size: 12px;
        font-weight: 700;
        padding-top: 2px;
    }

    @media (max-width: 767.98px) {
        .yd-services-pager {
            justify-content: center;
        }

        .yd-services-pager .yd-services-pagination,
        .yd-services-pager-jump {
            flex: 0 0 100%;
            justify-content: center;
        }

        .yd-services-pager .page-link {
            min-width: 36px;
            height: 36px;
            font-size: 13px;
        }
    }
</style>

<main id="main-container">
    <div class="service-area my-4">
        <!-- filters bar -->
        <div class="block-header bg-white mb-4">
            <div class="input-group">
                <input v-model="search" type="text" class="form-control form-control-alt" id="example-group3-input1-alt2" name="example-group3-input1-alt2" placeholder="{{Helper::getLang('Search')}}">
                <div class="input-group-prepend">
                    <button v-on:click="getServices()" type="button" class="btn btn-primary">
                        <i class="fa fa-search mx-2"></i> {{Helper::getLang('Search')}}
                    </button>
                </div>
                <select v-model="selected_api_provider" v-on:change="getServices()" class="form-control mx-3" name="api_providers" id="api_providers">
                    <option value="" selected>{{Helper::getLang('Api Provider')}}</option>
                    @foreach (Helper::api_providers() as $key => $api_providers)
                        <option @if (request()->api_provider == $key) selected @endif value="{{$key}}">{{$api_providers}}</option>
                    @endforeach
                </select>
            </div>

            @if (Gate::allows('isAdmin'))
                <button v-on:click="loadModal()" id="add-service" class="btn btn-primary"><i class="fa fa-plus" aria-hidden="true"></i></button>
            @endif
        </div>

        <div class="block block-rounded">
            <div class="block-header block-header-default">
                <h2 class="block-title text-uppercase font-w500">{{Helper::getLang('Services')}}</h2>
            </div>

            <div class="block-content">
                <div class="yd-services-table-wrap">
                    <table class="table table-striped table-borderless table-vcenter">
                        <thead class="thead-light">
                            <tr>
                                <th class="text-center" style="width: 50px;">#</th>
                                <th>{{Helper::getLang('Service')}}</th>
                                <th>{{Helper::getLang('Caregory')}}</th>
                                <th class="d-none d-sm-table-cell" style="width: 15%;">{{Helper::getLang('Rate per 1000')}}</th>
                                <th class="d-none d-sm-table-cell" style="width: 15%;">{{Helper::getLang('Min/Max order')}}</th>
                                <th class="d-none d-sm-table-cell" style="width: 5%;">{{Helper::getLang('Status')}}</th>
                                <th class="text-center" style="width: 140px;">{{Helper::getLang('Actions')}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="loading">
                                <tr>
                                    <td colspan="7" class="text-center py-4">
                                        <div class="spinner spinner-grow text-primary" role="status">
                                            <span class="sr-only">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            </template>

                            <template v-if="!loading">
                                <service-item
                                    v-for="service in services.data"
                                    :key="service.id"
                                    :service="service"
                                    :edit-fun="loadModal"
                                    :delete-fun="loadModalDelete"
                                    :view-fun="loadModalView"
                                    :permissions="permissions">
                                </service-item>
                            </template>
                        </tbody>
                    </table>
                </div>

                <div v-if="services && services.last_page > 1" class="yd-services-pager">
                    <div class="yd-services-pagination">
                        <pagination
                            align="center"
                            :data="services"
                            :limit="2"
                            :show-disabled="true"
                            @pagination-change-page="getServices">
                        </pagination>
                    </div>

                    <div class="yd-services-pager-jump">
                        <label for="yd-service-page-jump">اذهب إلى صفحة</label>
                        <input
                            id="yd-service-page-jump"
                            ref="servicePageJump"
                            type="number"
                            min="1"
                            :max="services.last_page"
                            :placeholder="services.current_page"
                            @keyup.enter.prevent="getServices(Math.max(1, Math.min(services.last_page, parseInt($event.target.value) || services.current_page)))">
                        <button
                            type="button"
                            @click="getServices(Math.max(1, Math.min(services.last_page, parseInt($refs.servicePageJump.value) || services.current_page)))">
                            انتقال
                        </button>
                    </div>

                    <div class="yd-services-pager-meta">
                        عرض @{{ services.from || 0 }} - @{{ services.to || 0 }} من @{{ services.total || 0 }} خدمة
                        &nbsp;•&nbsp;
                        الصفحة @{{ services.current_page || 1 }} من @{{ services.last_page || 1 }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>

@include('admin.modals.service.service-modal')
@include('admin.modals.delete-modal',['message' =>"Are you sure you want to delete this service?"])
@endsection

@section('scripts')
<script src="{{asset('js/pages/service.js')}}"></script>
@endsection
