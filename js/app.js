/**
 * INSPINIA - Responsive Admin Theme
 *
 */
(function () {
    angular.module('inspinia', [
        'ui.router',                    // Routing
        'oc.lazyLoad',                  // ocLazyLoad
        'ui.bootstrap',                 // Ui Bootstrap
        'pascalprecht.translate',       // Angular Translate
        'ngIdle',                       // Idle timer
        'ngSanitize',                   // ngSanitize
        'oitozero.ngSweetAlert'
    ])
    .filter('numberFixedLen', function () {
        return function (n, len) {
            var num = parseInt(n, 10);
            len = parseInt(len, 10);
            if (isNaN(num) || isNaN(len)) return n;
            num = '' + num;
            while (num.length < len) num = '0' + num;
            return num;
        };
    })
    .directive('auditFooter', function () {
        return {
            restrict: 'E',
            scope: {
                audit: '='
            },
            template: '<div ng-if="audit" class="well well-sm m-t-md m-b-none" style="font-size: 11px; color: #777; background: transparent; border: none; padding: 0 15px;">' +
                      '<div ng-if="audit.created_at"><i class="fa fa-info-circle"></i> <strong>Cadastrado por:</strong> {{audit.created_by}} em {{audit.created_at | date:"dd/MM/yyyy HH:mm"}}</div>' +
                      '<div ng-if="audit.updated_at && audit.updated_at !== audit.created_at"><i class="fa fa-refresh"></i> <strong>Última atualização:</strong> {{audit.updated_by}} em {{audit.updated_at | date:"dd/MM/yyyy HH:mm"}}</div>' +
                      '</div>'
        };
    })
    .constant('UiStandards', window.AppUiStandards || {})
    .run(['$rootScope', '$timeout', function ($rootScope, $timeout) {
        function closeOpenModals() {
            var $openModals = angular.element('.modal.in');

            if ($openModals.length) {
                $openModals.modal('hide');
            }

            $timeout(function () {
                if (typeof window.cleanupBootstrapModalState === 'function') {
                    window.cleanupBootstrapModalState();
                }
            }, 0, false);
        }

        angular.element(document).on('show.bs.modal', '.modal', function () {
            var $modal = angular.element(this);

            if (!$modal.parent().is('body')) {
                $modal.appendTo('body');
            }
        });

        function refreshUiStandards() {
            if (!window.AppUiStandards) return;

            $timeout(function () {
                window.AppUiStandards.applyActionIcons(document.body);
                window.AppUiStandards.repairVisibleText(document.body);
                window.AppUiStandards.patchPdfMake();
                window.AppUiStandards.setupSweetAlertDefaults();
            }, 0, false);
        }

        refreshUiStandards();
        $rootScope.$on('$stateChangeStart', closeOpenModals);
        $rootScope.$on('$stateChangeSuccess', refreshUiStandards);
        $rootScope.$on('$viewContentLoaded', refreshUiStandards);
    }]);
})();


// Other libraries are loaded dynamically in the config.js file using the library ocLazyLoad
