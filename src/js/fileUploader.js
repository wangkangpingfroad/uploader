var uploader = angular.module('froad.fileUploader', ['templates/fileUploaderTpl.html']);

uploader.controller('uploaderController', function($scope, $settings, $util, fileUploaderService, $timeout) {
	/**
	 * 点击图片的事件
	 * @prama {$event} 当前点击事件对象
	 * @method crop
	 */
	$scope.loadCropImage = function($event, $index) {
		angular.forEach($scope.images, function(image) {
			image.isHover = true;
		})

		// 初始化裁切框中的图片，第一张图片默认显示在裁切框中，hover上去时，是不需要有‘编辑’和‘删除’的
		$scope.images[$index].isHover = false;
		$scope.curImage = $scope.images[$index];

		$scope.imageCropCtrl.initCrop($scope);

		// 重新设置滚轮的高度
		$util.resetBarHeight($scope);
	};

	/**
	 * 删除图片（在页面上将图片去掉）
	 * @prama {$event} 当前点击事件对象
	 * @method delete
	 */
	$scope.remove = function($index) {
		// 如只有最后一张图片，提示信息
		$scope.dialog = true;
		$scope.btns = true;
		if ($scope.images.length > 1 && $scope.images[1].isPic) {
			$scope.MSG = $scope.TIPS_MSG.REMOVE_IMAGE_CONFIRM;
			$scope.yesFunc = handleRemove($index, $scope);
		} else {
			$scope.MSG = $scope.TIPS_MSG.LAST_IMAGES_LEFT;
			$scope.removeFunc = removeItem($index);
		}
	};

	var handleRemove = function($index, $scope) {
		return function() {
			// 将删除项从saved_images删除
			removeItem($index);
			// 掩藏弹层
			$scope.dialog = false;

			var curIndex = $scope.images.indexOf($scope.curImage),
				len = $scope.images.length;

			// 将删除项从images删除，并且用默认的图片代替删除的图片
			$scope.images.splice($index, 1);
			$scope.images.splice($scope.images.length, 0, {
				source: $scope.$parent.envImgHost + '/no-piture.png',
				isPic: false,
				isHover: false,
				isEdit: false,
				isAva: true,
			});

			$util.resetBarHeight($scope);

			// 只有删除第一张时，才需要初始化裁切框
			if ($index === 0 || curIndex === $index) {
				var cropBox = $util._getImageO($scope);

				//更新裁切框中的数据
				$scope.imageCropCtrl._refresh.call(cropBox);

				// 初始化裁切框中的图片，第一张图片默认显示在裁切框中，hover上去时，是不需要有‘编辑’和‘删除’的
				$scope.images[0].isHover = false;
				if (len === $index) {
					$scope.curImage = $scope.images[0];
				} else {
					$scope.curImage = $scope.images[$index].isPic ? $scope.images[$index] : $scope.images[0];
				}

				$scope.imageCropCtrl.initCrop($scope);
			}
			$scope.yesFunc = '';
		}
	}

	/**
	 * 删除图片（在页面上将图片去掉）
	 * @prama {$event} 当前点击事件对象
	 * @method delete
	 */
	$scope.hoverin = function($event) {
		var target = angular.element($event.target).find('div')[0],
			obj = angular.element(target);
		obj.hasClass('delect-scon') ? '' :
			obj.removeClass($settings.hideClass);
	};

	/**
	 * 删除图片（在页面上将图片去掉）
	 * @prama {$event} 当前点击事件对象
	 * @method delete
	 */
	$scope.hoverout = function($event) {
		var target = angular.element($event.currentTarget).find('div')[0],
			obj = angular.element(target);
		obj.hasClass('delect-scon') ? '' :
			obj.addClass($settings.hideClass);
	};

	/**
	 * 关闭上传裁剪组件
	 * @method close
	 */
	$scope.close = function() {
		$util.hideLoading($scope);

		if (!$util.hasNotSavedPic.call($scope)) {
			angular.isFunction($scope.$parent.complete) &&
				$scope.$parent.complete($scope.stat.saved_images);

			$util.resetBarHeight($scope);
			$scope.clear();

			return false;
		}

		$timeout(function() {
			$scope.dialog = true;
			$scope.btns = true;
			$scope.MSG = $scope.TIPS_MSG.NOT_SAVE_PIC;
		});
	};

	/**
	 * 提示框的确认键
	 * @method yes
	 */
	$scope.yes = function() {
		if ($scope.yesFunc) {
			angular.isFunction($scope.yesFunc) && $scope.yesFunc();
			return;
		}

		$scope.dialog = false;
		$scope.visible = false;

		angular.isFunction($scope.removeFunc) && $scope.removeFunc();

		angular.isFunction($scope.$parent.complete) &&
			$scope.$parent.complete($scope.stat.saved_images);

		$util.resetFileInput();
		$util.resetBarHeight($scope);
		$scope.clear();
	}

	/**
	 * 提示框的取消键
	 * @method yes
	 */
	$scope.no = function() {
		$scope.dialog = false;
	}

	/**
	 * 在关闭上传裁剪组件之前，将未裁切的图片的值传至开发者
	 * @method save
	 */
	$scope.save = function() {
		// 当没有未编辑过的图片时，直接关闭组件
		if (!$util.hasNotSavedPic.call($scope)) {
			angular.isFunction($scope.$parent.complete) &&
				$scope.$parent.complete($scope.stat.saved_images);

			$util.resetBarHeight($scope);
			$scope.clear();
			return false;
		}

		var images = $scope.images,
			notSaved = [];

		for (var i = 0; i < images.length; i++) {
			if (!images[i].isPic || images[i].isEdit) {
				continue;
			}

			notSaved.push(images[i]);
		};

		$scope.stat.croped_files = $scope.stat.saved_files = notSaved.length;

		var data = [];
		for (var i = 0; i < notSaved.length; i++) {
			$scope.curImage = notSaved[i];
			$scope.imageCropCtrl.initCrop($scope, $scope.curImage.fileKey, function() {
				var postData = $scope.$parent.result;
				data.push(postData);
			});
		}

		$timeout(function() {
			for (var i = data.length - 1; i >= 0; i--) {
				$scope.curImage = $scope.images[i];
				cropFn(false, data[i]);
			};
		}, 1000);

		$util.resetBarHeight($scope);

		$scope.visible = false;
		// 显示‘正在保存’弹层
		$scope.dialogOut = true;
		$scope.MSG = $scope.TIPS_MSG.SAVING_STATUS;
		$scope.bnts = false;
	};

	/**
	 * 清除组件数据
	 * @method close
	 */
	$scope.clear = function() {
		$scope.images = [];
		$scope.curImage = [];
		$scope.stat.error_files = [];
		$scope.stat.saved_images = [];
		$scope.stat.save_fail_files = [];
		$scope.stat.crop_fail_files = [];
		$scope.stat.successful_uploads = 0;
		$scope.stat.saved_files = 0;
		$scope.stat.croped_files = 0;
		$scope.visible = false;
	};

	/**
	 * 编辑键
	 * @method edit
	 */
	$scope.edit = function() {
		// 防止重复提交
		if ($scope.curImage.isEdit) {
			return false;
		}

		var postData = $scope.$parent.result;
		postData.fileKey = $scope.curImage.fileKey;

		$scope.stat.croped_files = 1;

		$timeout(function() {
			$scope.loadingInside = true;
		});

		cropFn(true, postData);
	}

	/**
	 * 发送裁切请求
	 * @prama {status} 区别编辑和保存的状态
	 * @method cropFn
	 */
	var cropFn = function(status, postData) {
		if (!postData) {
			return false;
		}

		var url = $scope.$parent.apiHost + $scope.cropUrl,
			fileName = $scope.curImage.fileName; // FIX BUG: 保存图片时，部分成功，部分失败，图片的名称显示一致

		fileUploaderService.cropImage(postData, url).success(function(data) {
			$scope.stat.croped_files -= 1;

			if (data.code !== '0000') {
				// 不能重复push filename
				if ($scope.stat.crop_fail_files.length > 0) {
					$scope.stat.crop_fail_files.indexOf(fileName) >= 0 ? '' :
						$scope.stat.crop_fail_files.push(fileName);
				} else {
					$scope.stat.crop_fail_files.push(fileName);
				}

				if ($scope.stat.croped_files > 0) {
					return;
				}
			} else {
				var index = $scope.stat.crop_fail_files.indexOf(fileName);
				if (index >= 0) {
					$scope.stat.crop_fail_files.splice(index, 1);
				}
			}

			if ($scope.stat.croped_files === 0) {
				if ($scope.stat.crop_fail_files.length > 0) {
					(status || ($scope.stat.croped_files === 0 && !status)) ?
					$util._handleErr($scope, $scope.TIPS_MSG.CROP_FAIL): '';
				}

				$scope.loadingInside = false;

				if (data.code !== '0000') {
					!status && angular.isFunction($scope.$parent.complete) &&
						$scope.$parent.complete($scope.stat.saved_images);

					!status && $scope.clear();
					return;
				}
			}

			var params = {
				'fileKey': data.data.fileKey
			};
			saveFn(params, fileName, status);
		}).error(function(data) {
			$scope.stat.croped_files -= 1;
			$scope.stat.save_fail_files.push(fileName);
			status ? $util._handleErr($scope, $scope.TIPS_MSG.CROP_FAIL) : '';

			// 当编辑的时候加上loading状态
			$timeout(function() {
				$scope.loadingInside = false;
			});
		});
	}

	/**
	 * 发送保存请求
	 * @prama {params} 发送保存请求的参数
	 * @prama {status} 区别编辑和保存的状态
	 * @method saveFn
	 */
	var saveFn = function(params, fileName, status) {
		if (!params) {
			return false;
		}

		var url = $scope.$parent.apiHost + $scope.$parent.saveUrl;

		fileUploaderService.saveImage(params, url).success(function(res) {
			if ($scope.stat.saved_files > 0) {
				$scope.stat.saved_files -= 1;
			}

			if (res.code !== '0000') {
				// 不能重复push filename
				if ($scope.stat.save_fail_files.length > 0) {
					$scope.stat.save_fail_files.indexOf(fileName) >= 0 ? '' :
						$scope.stat.save_fail_files.push(fileName);
				} else {
					$scope.stat.save_fail_files.push(fileName);
				}

				if ($scope.stat.save_fail_files.length > 0) {
					// 编辑状态 和 非编辑状态但是queue complete
					// (status || (!status && !$scope.stat.saved_files)) ? 
					// 	$util._handleErr($scope, $scope.TIPS_MSG.SAVE_FAIL): '';
				}

				// 当编辑的时候加上loading状态
				$timeout(function() {
					$scope.loadingInside = false;
				});

				if ($scope.stat.save_fail_files > 0) {
					return;
				}
			} else {
				$scope.stat.saved_images.push(res.imageName);
				// 裁切之后不用在裁切框中显示已经裁切之后的图片
				$scope.curImage.isEdit = true;

				// FIX bug: 裁切之后的图片闪动
				$scope.testImage = $scope.curImage.source;

				$scope.curImage.fileKey = res.imageName;
				$scope.curImage.source = $scope.imageHost + res.imageName;

				var index = $scope.stat.save_fail_files.indexOf(fileName);
				if (index >= 0) {
					$scope.stat.save_fail_files.splice(index, 1);
				}
			}

			if ($scope.stat.saved_files <= 0) {
				var msg = $scope.TIPS_MSG.SAVE_SUCCESS;

				if ($scope.stat.save_fail_files.length > 0) {
					msg = $scope.TIPS_MSG.SAVE_FAIL;
				}

				$util._handleErr($scope, msg, !status);

				// 当编辑的时候加上loading状态
				$timeout(function() {
					$scope.loadingInside = false;
				});

				!status && angular.isFunction($scope.$parent.complete) &&
					$scope.$parent.complete($scope.stat.saved_images);

				// 将‘正在保存中’的	弹层掩藏
				$scope.dialogOut = false;

				!status && $scope.clear();
			}
		}).error(function() {
			if ($scope.stat.saved_files > 0) {
				$scope.stat.saved_files -= 1;
			}

			$scope.stat.save_fail_files.push(fileName);
			(status || (!status && !$scope.stat.saved_files)) ? $util._handleErr($scope, $scope.TIPS_MSG.SAVE_FAIL): '';

			if ($scope.stat.saved_files <= 0) {

				!status && angular.isFunction($scope.$parent.complete) &&
					$scope.$parent.complete($scope.stat.saved_images);

				// 当编辑的时候加上loading状态
				$timeout(function() {
					$scope.loadingInside = false;
				});

				!status && $scope.clear();
			}
		});
	}

	/**
	 * 重新设置裁切框中图片的位置
	 * @prama {$scope} scope
	 * @method _resetPosition
	 */
	var _resetPosition = function($scope) {
		var cropImageTarget = $util._getImageO($scope);

		cropImageTarget.css('marginLeft', '0px');
		cropImageTarget.css('marginTop', '0px');
		cropImageTarget.css('width', $scope.$parent.viewW + 'px');
		cropImageTarget.css('height', $scope.$parent.viewH + 'px');
	}

	var removeItem = function(index) {
		var removeItem = $scope.images[index];
		var collections = $scope.stat.saved_images,
			ind = collections.indexOf(removeItem.fileKey);

		ind >= 0 ? collections.splice(ind, 1) : '';
	}
});

uploader.service('fileUploaderService', function($http, $q, $settings) {
	return {

		/**
		 * 检查用户是否有权限上传
		 * @param {postData} 请求需要的参数,类型为FormData
		 * @param {askAuthUrl} 请求URL
		 * @method getToken
		 */
		getToken: function(postData, url) {
			return $http({
				method: "get",
				url: url,
				params: postData
			});
		},

		/**
		 * 将文件发送至七牛
		 * @param {postData} 请求需要的参数,类型为对象
		 * @method sendFile
		 */
		sendFile: function(postData, url) {
			return $http({
				method: "POST",
				url: url,
				data: postData,
				headers: {
					// 覆盖原始的content-type的值(application/json),content-type的值应该为application/formdata
					'Process-Data': undefined,
					'Content-Type': undefined
				}
			});
		},

		/**
		 * 将裁剪参数发送至后台，返回裁剪之后的图片
		 * @param {postData} 请求需要的参数,类型为对象；
		 * @param {postData}：裁剪框的长宽，图片的坐标，缩放的倍数
		 * @method cropImage
		 */
		cropImage: function(postData, url) {
			return $http({
				url: url,
				data: postData,
				method: "POST",
				headers: {
					'Data-Type': 'json',
					'Content-Type': 'application/json'
				}
			});
		},

		/**
		 * 将裁剪参数发送至后台，返回裁剪之后的图片
		 * @param {postData} 请求需要的参数,类型为对象；
		 * @param {postData}：裁剪框的长宽，图片的坐标，缩放的倍数
		 * @method save
		 */
		saveImage: function(postData, url) {
			return $http({
				url: url,
				data: postData,
				method: "POST",
				headers: {
					'Data-Type': 'json',
					'Content-Type': 'application/json'
				}
			});
		},

		remove: function(postData, url) {
			return $http({
				url: url,
				data: postData,
				method: "POST",
				headers: {
					'Data-Type': 'json',
					'Content-Type': 'application/json'
				}
			});
		}
	};
});

uploader.service('ajaxUploader', function($settings, fileUploaderService, $util, $timeout) {
	var uploaderService = {};
	/**
	 * 初始用Ajax方式上传的组件
	 * @method initAjaxUploader
	 */
	uploaderService.initAjaxUploader = function(target) {
		var $scope = this,
			fileInput = $util._getElement($settings.selectImageAttr);

		if (!fileInput) {
			return false;
		}

		fileInput.attr('accept', $scope.fileTypes);
		fileInput.attr('multiple', $scope.isMultiple);
		fileInput.attr('maxLength', $scope.maxNum);

		target.bind('click', function(event) {
			// Fix Bug: IE10以下选择同一张图片时，不能触发change事件
			if ($util.browser() === 'ie') { //for IE10 ~ IE11  
				var form = document.createElement('form'),
					ref = fileInput[0].parentNode;
				form.appendChild(fileInput[0]);
				form.reset();
				$(ref).empty();
				ref.appendChild(fileInput[0]);
			} else {
				fileInput.val('');
			}
			fileInput.trigger('click');
		})

		fileInput.bind('change', function(event) {
			var e = event ? event : window.event,
				files = $scope.files = e.target.files,
				len = files.length;

			if (len <= 0) {
				return false;
			}

			$scope.$parent.getMaxNum && $scope.$parent.getMaxNum();

			$scope.clear();
			$scope.queue = [];

			// 检查是否超过上传数量
			var msg = $util.checkMaxNum($scope, len)
			if (msg) {
				$timeout(function() {
					$scope.dialogOut = true;
					$scope.MSG = msg;
					$scope.bnts = false;
				});

				$timeout(function() {
					$scope.dialogOut = false;
					$util.resetFileInput();
				}, 2000);
				return false;
			}

			// 检查文件的大小和尺寸是否符合
			for (var i = 0; i <= len - 1; i++) {
				var file = files[i],
					fileTypes = file.type.split('/')[1],
					fileSize = file.size;

				if (!$util.checkFileType(fileTypes, $scope)) {
					$scope.stat.error_files.push(file.name);
					$util._handleErr($scope, $scope.TIPS_MSG.FILE_TYPES_EXCEED, true);
					return false;
				}

				if (!$util.checkFileSize(fileSize, $scope)) {
					$scope.stat.error_files.push(file.name);
					$util._handleErr($scope, $scope.TIPS_MSG.FILE_SIZE_EXCEED, true);
					return false;
				}

				$scope.queue.push(file);
			}
			// 无符合的文件，则退出 
			if ($scope.queue.length === 0) {
				$scope.clear();
				return false;
			}

			// 无符合的文件，则退出
			for (var i = 0; i < $scope.$parent.maxNum; i++) {
				$scope.images.push({
					source: $scope.$parent.envImgHost + '/no-piture.png',
					isPic: false,
					isHover: false,
					isEdit: false,
					isAva: true,
				});
			}

			$util.showLoading($scope);

			for (var j = 0; j < $scope.queue.length; j++) {
				getIdentify.call($scope, $scope.queue[j]);
			};

		});
	};

	/**
	 * 从业务层获取授权
	 * @param {file} 单个文件对象
	 * @method getIdentify
	 */
	var getIdentify = function(file) {
		var reader = new FileReader(),
			scope = this;

		reader.onload = (function() {
			var postData = $util.getPostData.call(file),
				url = scope.$parent.apiHost + scope.askAuthUrl;

			if (!postData) {
				return false;
			}

			fileUploaderService.getToken(postData, url).success(function(result) {
				if (result.code === '0000' && result.data.token) {

					sendFile(file, result.data.token, result.data.fileKey, reader, scope);

				} else if (result.code === '601') {
					scope.stat.error_files.push(file.name);
					scope.stat.upload_errors += 1;
					return false;
				} else {
					scope.stat.error_files.push(file.name);
					scope.stat.upload_errors += 1;
					return false;
				}
			}).error(function(error) {
				scope.stat.error_files.push(file.name);
				scope.stat.upload_errors += 1;
			});
		})(file);

		reader.readAsDataURL(file);
	}

	/**
	 * 请求将文件上传至七牛
	 * @param {f} 单个文件对象
	 * @param {token} 文件上传的授权
	 * @param {key} 文件名
	 * @param {reader} FileReader对象，其中可用来读取文件
	 * @method sendFile
	 */
	var sendFile = function(f, token, fileKey, reader, $scope) {
		//构造FormData
		var formData = new FormData();
		formData.append('key', fileKey);
		formData.append('token', token);
		formData.append('file', f);

		var fileName = f.name;

		fileUploaderService.sendFile(formData, $settings.uploadUrl).success(function(data) {
			if (!data) {
				$scope.stat.error_files.push(fileName);
				$scope.stat.upload_errors += 1;
				return false;
			}

			// if (!$scope.imageCropCtrl._checkPicAva($scope, reader.result)) {
			// 	$scope.stat.error_files.push(f.name);
			// 	$scope.stat.upload_errors += 1;

			// 	var postData = {
			// 			fileKey: data.fileKey
			// 		},
			// 		url = $scope.$parent.apiHost + $scope.$parent.remove;

			// 	fileUploaderService.remove(postData, url).success(function() {
			// 		console && console.log('delete images successfully');
			// 	}).error(function() {
			// 		console && console.log('delete images fail');
			// 	});
			// 	return false;
			// };

			$scope.stat.successful_uploads += 1;
			// 当一张成功上传的图片才把上传组件显示出来
			if ($scope.stat.successful_uploads === 1) {
				$util.hideLoading($scope);

				$scope.visible = true;
			}
			$scope.queue.shift();

			$scope.images.splice($scope.stat.successful_uploads - 1, 1, {
				source: reader.result,
				isPic: true,
				isEdit: false,
				isHover: true,
				fileName: fileName,
				fileKey: fileKey,
				isAva: true,
			});

			// upload complete
			if ($scope.queue.length === 0) {

				angular.isFunction($scope.uploadComplete) &&
					$scope.uploadComplete($scope.stat);

				if ($scope.stat.upload_errors > 0) {
					$util._handleErr($scope, $scope.TIPS_MSG.UPLOAD_FAIL);
				}

				// 如不希望加载裁切组件，则结束
				if (!$scope.imagecrop) {
					return false;
				}
				$scope.imageCropCtrl.initView($scope);

				// 初始化裁切框中的图片，第一张图片默认显示在裁切框中，hover上去时，是不需要有‘编辑’和‘删除’的
				$scope.images[0].isHover = false;
				$scope.curImage = $scope.images[0];
				$scope.imageCropCtrl.initCrop($scope);

				$util.resetFileInput();
				$util.resetBarHeight($scope);
			}
		}).error(function(error, status) {
			$scope.stat.error_files.push(fileName);
			$scope.stat.upload_errors += 1;
			$scope.queue.shift();

			// upload complete
			if ($scope.queue.length === 0) {

				angular.isFunction($scope.$parent.uploadComplete) &&
					$scope.$parent.uploadComplete($scope.stat);

				$util.hideLoading($scope);

				var msg = $scope.TIPS_MSG.UPLOAD_FAIL;
				$util._handleErr($scope, msg, ($scope.stat.successful_uploads === 0));

				$util.resetFileInput();
				$util.resetBarHeight($scope);
			}
		});
	}

	return uploaderService;
});

uploader.service('flashUploader', function($settings, fileUploaderService, $util, $timeout) {

	var flashUploader = {
		swfupload: function(target) {
			var $scope = this,
				node = $util._getElement($scope.formSelector);

			$scope.$parent.getMaxNum && $scope.$parent.getMaxNum();
			var config = _getSetting.call($scope, target);

			node.scope = $scope;

			config.upload_start_handler = flashUploader.proxy(start, node);

			config.file_dialog_start_handler = flashUploader.proxy(fileDialogStart, node);

			config.file_queued_handler = flashUploader.proxy(fileQueued, node);

			config.file_dialog_complete_handler = flashUploader.proxy(fileDialogComplete, node);

			config.upload_success_handler = flashUploader.proxy(uploadSuccess, node);

			config.file_queue_error_handler = flashUploader.proxy(fileQueueError, node);

			config.queue_complete_handler = flashUploader.proxy(queueComplete, node);

			config.upload_error_handler = flashUploader.proxy(uploadError, node);


			var swfupload = new SWFUpload(config);
			node.uploader = swfupload;
			node.maxNum = $scope.$parent.maxNum;
		},

		proxy: function(fn, context) {
			return function() {
				return fn.apply(context, arguments);
			};
		}

	};

	var common = {
		isCheckNumber: false,
		isLimitNumber: false,
		queuedArray: [],
	}

	var fileDialogStart = function() {
		this.uploader.setFileUploadLimit(this.scope.$parent.maxNum);
	};

	var fileDialogComplete = function(selected, queued, total) {
		// 更新maxNum的值
		this.scope.$parent.getMaxNum && this.scope.$parent.getMaxNum();

		// 打开对话框未选中文件，关掉对话框，需删除
		if (selected === 0) {
			$util.hideLoading(this.scope);
			return false;
		}
		this.uploader.setFileUploadLimit(this.scope.$parent.maxNum);

		// FIX: 当用户在页面中删除图片，无法更新uploader.stats中的属性，所以每次重置为0，自己的代码来控制数量
		this.uploader.setStats({
			files_queued: 0,
			in_progress: 0,
			queue_errors: 0,
			successful_uploads: 0,
			upload_cancelled: 0,
			upload_errors: 0,
		});


		// 判断选中的图片数量是否超多限制
		var content = $util.checkMaxNum(this.scope, selected);
		if (content) {
			$util._handleErr(this.scope, content, true);

			for (var i = 0; i < common.queuedArray.length; i++) {
				this.uploader.cancelUpload(common.queuedArray[i], false);
			};

			return false;
		}

		$util._setDefaultImages(this.scope);
		this.scope.stat.successful_uploads = 0;

		var self = this,
			postData = $util.getPostData(),
			url = this.scope.$parent.apiHost + this.scope.askAuthUrl;

		fileUploaderService.getToken(postData, url).success(function(data) {
			var token = data.data.token;
			if (token != "") {
				var postParams = {
					'key': data.data.fileKey,
					'token': token,
				};
				self.uploader.setPostParams(postParams);
				self.uploader.startUpload();

				$util.showLoading(self.scope);
			} else {
				self.scope.stat.error_files.push('');
				self.scope.stat.upload_errors += 1;
			}
		}).error(function() {
			self.scope.stat.error_files.push('');
			self.scope.stat.upload_errors += 1;
		});
	};

	var fileQueued = function(file) {
		common.queuedArray.push(file.id);
	};

	var uploadSuccess = function(file, serverData) {
		var that = this,
			serverData = JSON.parse(serverData);
		if (!serverData) {
			this.scope.stat.error_files.push(file.name);
			this.scope.stat.upload_errors += 1;
			return false;
		}

		var key = serverData.key;
		// if (!this.scope.imageCropCtrl._checkPicAva(this.scope, $settings.QNmageHost + key)) {
		// 	this.scope.stat.error_files.push(file.name);
		// 	this.scope.stat.upload_errors += 1;

		// 	var postData = {
		// 			fileKey: key
		// 		},
		// 		url = this.scope.$parent.apiHost + this.scope.$parent.remove;

		// 	fileUploaderService.remove(postData, url).success(function() {
		// 		console && console.log('delete images successfully');
		// 	}).error(function() {
		// 		console && console.log('delete images fail');
		// 	});
		// 	return false;
		// };

		this.scope.stat.successful_uploads += 1;


		// 当一张成功上传的图片才把上传组件显示出来
		if (this.scope.stat.successful_uploads === 1) {
			// 无符合的文件，则退出
			for (var i = 0; i < that.scope.$parent.maxNum; i++) {
				that.scope.images.push({
					source: that.scope.$parent.envImgHost + '/no-piture.png',
					isPic: false,
					isHover: false,
					isEdit: false,
					isAva: true,
				});
			}

			$util.hideLoading(that.scope);
			that.scope.visible = true;
		}

		// 为兼容改变Images中的值不能马上显示出来
		that.scope.images.splice(that.scope.stat.successful_uploads - 1, 1, {
			source: $settings.QNmageHost + key,
			isPic: true,
			isEdit: false,
			isHover: true,
			fileKey: key,
			fileName: file && file.name,
			isAva: true,
		});

	}

	var queueComplete = function(file) {
		var that = this;
		$util.hideLoading(that.scope);

		// 为兼容改变Images中的值不能马上显示出来
		$timeout(function() {
			if (!that.scope.imagecrop) {
				return false;
			}

			if (that.scope.stat.upload_errors > 0) {
				console.log('uploader_errors:' + that.scope.stat.upload_errors);
				$util._handleErr(that.scope, that.scope.TIPS_MSG.UPLOAD_FAIL);
			}

			if (that.scope.stat.successful_uploads === 0) {
				that.scope.clear();
				return false;
			}

			that.scope.imageCropCtrl.initView(that.scope);

			// 初始化裁切框中的图片，第一张图片默认显示在裁切框中，hover上去时，是不需要有‘编辑’和‘删除’的
			that.scope.images[0].isHover = false;
			that.scope.curImage = that.scope.images[0];

			that.scope.imageCropCtrl.initCrop(that.scope);

			that.uploader.setStats({
				successful_uploads: 0,
				upload_errors: 0,
				files_queued: 0
			});
		});
	}

	var uploadError = function(file, code, message) {
		file && this.scope.stat.error_files.push(file.name);
		this.scope.stat.upload_errors += 1;
	}

	var fileQueueError = function(file, code, message) {
		file && this.scope.stat.error_files.push(file.name);
		this.scope.stat.upload_errors += 1;
	}

	var start = function(file) {
		var self = this,
			postData = $util.getPostData(),
			url = self.scope.$parent.apiHost + self.scope.askAuthUrl;

		fileUploaderService.getToken(postData, url).success(function(data) {
			var token = data.data.token;
			if (token != "") {
				var postParams = {
					'key': data.data.fileKey,
					'token': token,
				};
				self.uploader.setPostParams(postParams);
			} else {
				this.scope.stat.error_files.push(file.name);
				this.scope.stat.upload_errors += 1;
			}
		}).error(function() {
			this.scope.stat.error_files.push(file.name);
			this.scope.stat.upload_errors += 1;
		});
	}

	var _getSetting = function(target) {
		return {
			upload_url: $settings.uploadUrl,
			flash_url: this.$parent.envImgHost + "/swfupload.swf",

			file_post_name: 'file',
			file_size_limit: $util.transferFileSize(this.maxFileSize),
			file_types: this.fileTypes,
			file_upload_limit: this.$parent.maxNum,

			button_image_url: this.$parent.envImgHost + '/uploader.png',
			button_placeholder: target[0],
			button_width: 65,
			button_height: 28,
			button_cursor: SWFUpload.CURSOR.HAND,
			button_window_mode: SWFUpload.WINDOW_MODE.TRANSPARENT,
			debug: false

		};
	}

	return flashUploader;
});

uploader.service('singlerUploader', function($settings, fileUploaderService, $util, $timeout) {
	var singlerUploader = {
		FRAME_NAME: 'LBF-UPLOADER'
	};

	/**
	 * 初始上传组件（单个文件上传，且只用于IE8,IE9）
	 * @method initUploaderSingle
	 */
	singlerUploader.initUploaderSingle = function(target) {
		var $scope = this,
			fileInput = $util._getElement($settings.selectImageAttr);

		target.bind('click', function(e) {
			e.preventDefault();
			fileInput.trigger('click');
		})

		fileInput.bind('change', function(event) {
			var e = event ? event : window.event,
				activeXObject = new ActiveXObject('Scripting.FileSystemObject'),
				arr = this.value.split('\\'),
				fileName = arr[arr.length - 1];

			var _file = $scope.files = activeXObject.getFile(fileName);

			$scope.$parent.getMaxNum && $scope.$parent.getMaxNum();

			var msg = $util.checkMaxNum($scope);
			if (msg) {
				$timeout(function() {
					$scope.dialogOut = true;
					$scope.MSG = msg;
					$scope.bnts = false;
				});

				$timeout(function() {
					$scope.dialogOut = false;
					$util.resetFileInput();
				}, 2000);
				return false;
			}

			if (!$util.checkFileType(_file.type, $scope)) {
				$scope.stat.error_files.push(file.name);
				$util._handleErr($scope, $scope.TIPS_MSG.FILE_TYPES_EXCEED, true);
				return false;
			}

			if (!$util.checkFileSize(_file.size, $scope)) {
				$scope.stat.error_files.push(file.name);
				$util._handleErr($scope, $scope.TIPS_MSG.FILE_SIZE_EXCEED, true);
				return false;
			}

			$util.showLoading($scope);

			uploaderSingle($scope);
		});
	}

	var render = function(token, key, $scope) {
		var node = $util._getElement($scope.formSelector),
			frameName = singlerUploader.FRAME_NAME + '-' + $scope.target,
			url = $settings.uploadUrl,
			str = '',
			data = {
				token: token,
				key: key,
				accept: 'text/plain' // NOTE: 七牛用表单方式提交，必须指定accept为‘text/plain’!!!
			};

		for (var name in data) {
			if (data.hasOwnProperty(name)) {
				str += '<input type="hidden" name="' + name + '" value="' + data[name] + '" />';
			}
		};

		node.append(str);

		node.append('<iframe id="' + frameName + '" name="' + frameName + '" style="display: none;"></iframe>');

		node.attr('target', frameName);
	}

	/**
	 * 上传单个文件
	 * @method uploader
	 */
	var uploaderSingle = function($scope) {
		var data = $util.getPostData(),
			url = $scope.$parent.apiHost + $scope.askAuthUrl;

		// 申请上传凭证
		fileUploaderService.getToken(data, url).success(function(result) {
			if (result.code === '0000' && result.data.token) {

				render(result.data.token, result.data.fileKey, $scope);
				sendSingleFile($scope, $scope.files, data);
			} else if (result.code === 601) {
				$scope.stat.error_files.push(name);
				$util._handleErr($scope, $scope.TIPS_MSG.UPLOAD_FAIL);
				return false;
			} else {
				$scope.stat.error_files.push(name);
				$util._handleErr($scope, $scope.TIPS_MSG.UPLOAD_FAIL);
				return false;
			}
		}).error(function(error) {
			$scope.stat.error_files.push(name);
			$util._handleErr($scope, $scope.TIPS_MSG.UPLOAD_FAIL);
		})
	}

	/**
	 * 发送单个文件至七牛：使用Form表单方式提交请求
	 * @method sendSingleFile
	 */
	var sendSingleFile = function($scope, file, data) {

		$util._getElement('#submit').click();

		var $iframe = $util._getElement($scope.formSelector).find('iframe');

		$iframe.bind('load', function() {
			if (this.readyState !== 'complete') {
				return false;
			}

			var doc = this.contentDocument || this.contentWindow.document,
				str = '';

			if (doc.getElementsByTagName('pre').length > 0) {
				str = angular.element(doc).find('pre').html();
			} else {
				str = doc.document && doc.document.body.innerHTML;
			}
			var result = str ? JSON.parse(str) : {};

			if (!result || !result.key) {
				$scope.stat.error_files.push(file.name);
				$timeout(function() {
					$util.hideLoading($scope);
					$util._handleErr($scope, $scope.TIPS_MSG.UPLOAD_FAIL, true);
				});
				return false;
			}

			if (!$scope.imagecrop) {
				return false;
			}
			$scope.stat.successful_uploads += 1;

			// 当一张成功上传的图片才把上传组件显示出来
			if ($scope.stat.successful_uploads > 0) {
				$util.hideLoading($scope);
				$scope.visible = true;
			}

			var source = $settings.QNmageHost + result.key;
			$scope.images = [];

			$scope.images.push({
				source: source,
				isPic: true,
				isEdit: false,
				fileKey: result.key,
				isAva: true,
			});

			$scope.imageCropCtrl.initView($scope);

			// 初始化裁切框中的图片，第一张图片默认显示在裁切框中，hover上去时，是不需要有‘编辑’和‘删除’的
			$scope.images[0].isHover = false;

			$scope.curImage = $scope.images[0];
			$scope.imageCropCtrl.initCrop($scope);

			// $iframe.remove();

			$util.resetFileInput();
			$util.resetBarHeight($scope);
		});
	}

	return singlerUploader;
});

uploader.service('$util', function($settings, $window, $timeout) {
	var $util = {};

	/**
	 * 检查上传的文件大小是否支持
	 * @param {fileSize} 该文件的类型
	 * @param {scope} scope
	 * @method checkFileSize
	 */
	$util.checkFileSize = function(fileSize, scope) {
		var size = fileSize,
			maxSize = $util.transferFileSize(scope.maxFileSize),
			minSize = $util.transferFileSize(scope.minFileSize),
			flag = maxSize == 0 || (size <= maxSize && size >= (minSize || 0));

		if (!flag) {
			scope.stat.queue_errors += 1;

			angular.isFunction(scope.uploadError) &&
				scope.uploadError(scope.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT);
			$util.resetFileInput();
		}

		return flag;
	}

	/**
	 * 检查上传的文件类型是否支持
	 * @param {fileSize} 该文件的类型
	 * @param {scope} scope
	 * @method checkFileType
	 */
	$util.checkFileType = function(fileTypes, scope) {
		var type = fileTypes;
		if (this._checkTridentV()) {
			type = fileTypes.split(' ')[0].toLowerCase();
		}
		var allowedType = scope.fileTypes,
			flag = allowedType.match(type);

		if (!flag) {
			scope.stat.queue_errors += 1;
			angular.isFunction(scope.uploadError) &&
				scope.uploadError(scope.QUEUE_ERROR.INVALID_FILETYPE);

			$util.resetFileInput();
		}

		return flag;
	}

	/**
	 * 根据用户提供的文件大小，转成单位为B的，然后设置到scope中
	 * @method transferFileSize
	 */
	$util.transferFileSize = function(fileSizeLimit) {
		// 如果用户没有提供,则用默认值
		if (!fileSizeLimit) {
			return fileSizeLimit;
		}

		var size = fileSizeLimit.toString().toUpperCase().match(/(\d+)\s*(MB|B|GB|KB)?/i);
		if (!size[2]) {
			size = size[1];
		} else {
			switch (size[2]) {
				case 'B':
					size = size[1];
					break;
				case 'KB':
					size = size[1] * 1024;
					break;
				case 'MB':
					size = size[1] * 1024 * 1024;
					break;
				case 'GB':
					size = size[1] * 1024 * 1024 * 1024;
			}
		}

		return size;
	}

	/**
	 * 重新设置file input
	 * @method resetFileInput
	 */
	$util.resetFileInput = function() {
		var fileInput = $util._getElement($settings.selectImageAttr);
		fileInput.val('');
	}

	/**
	 * 重新设置Bar的高度
	 * @method resetBarHeight
	 */
	$util.resetBarHeight = function(scope) {
		var zoomBox = $util._getElement(scope.zoomBox);
		zoomBox.css('height', '14px');
	}

	/**
	 * 通过选择器得到Jquery Lite对象
	 * @param {selector}
	 * @method _getElement
	 */
	$util._getElement = function(selector) {
		return angular.element(document.querySelector(selector));
	}

	/**
	 * 通过选择器得到Jquery Lite List对象
	 * @param {selector}
	 * @method _getElement
	 */
	$util._getAllElement = function(selector) {
		return angular.element(document.querySelectorAll(selector));
	}

	/**
	 * 检查当前的浏览器是否为IE8,IE9
	 * @param {selector}
	 * @method _checkTridentV
	 */
	$util._checkTridentV = function() {
		return navigator.userAgent.indexOf('MSIE 8.0') >= 0 ||
			navigator.userAgent.indexOf('MSIE 9.0') >= 0;
	}

	/**
	 * 检查当前的浏览器
	 * @method browser
	 */
	$util.browser = function() {
		var userAgent = $window.navigator.userAgent;

		var browsers = {
			chrome: /chrome/i,
			safari: /safari/i,
			firefox: /firefox/i,
			ie: /Trident/i
		};

		for (var key in browsers) {
			if (browsers[key].test(userAgent)) {
				return key;
			}
		};

		return 'unknown';
	}

	/**
	 * 组装Post Data
	 * @param {selector}
	 * @method getPostData
	 */
	$util.getPostData = function() {
		return postData = {
			fsizeLimitMax: 0,
			fsizeLimitMin: 0,
			mimeLimit: 'image/*',
			widthLimitMin: 0,
			widthLimitMax: 0,
			heightLimitMin: 0,
			heightLimitMax: 0,
			num: Math.random(), // FIX BUG: 在360安全浏览器 极速模式中，如一个请求加上多个参数是相同的，就只会发一次请求
		};
	}

	/**
	 * 检查当前上传的图片数量是否max num；
	 * @param {curLen} 当前上传图片的数量
	 * @param {maxNum} 图片数量的最大值
	 * @method checkMaxNum
	 */
	$util.checkMaxNum = function(scope, curLen) {
		var maxNum = scope.$parent.maxNum;

		if ((curLen || 1) <= 0) {
			return scope.TIPS_MSG.NONE_IMAGE;
		}

		if (curLen > parseInt(maxNum)) {
			if (maxNum === 0) {
				return '请删除之后再上传图片';
			}
			return '最多只能上传' + maxNum + '张图片';
		}

		return '';
	}

	/**
	 * 处理各种情况的错误信息
	 * @param {scope} scope
	 * @param {msg} 错误信息
	 * @param {isOut} 是否显示在弹框之外
	 * @method _handleErr
	 */
	$util._handleErr = function(scope, msg, isOut) {
		var files = [],
			str = '';

		if (scope.stat.error_files.length > 0) {
			files = scope.stat.error_files;
		} else if (scope.stat.save_fail_files.length > 0) {
			if (scope.stat.crop_fail_files.length > 0) {

				scope.stat.crop_fail_files.forEach(function(fileName, index) {
					scope.stat.save_fail_files.push(fileName);
				});
			}

			files = scope.stat.save_fail_files;
		} else {
			files = scope.stat.crop_fail_files;
		}

		var len = files.length;
		for (var i = 0; i < len; i++) {
			str = str + files[i] + (len - 1 === i ? '' : ',');
		};

		$timeout(function() {
			isOut ? scope.dialogOut = true : scope.dialog = true;
			scope.btns = false;
			scope.MSG = str + msg;
		});

		$timeout(function() {
			scope.dialog = false;
			scope.dialogOut = false;
			if (scope.stat.save_fail_files.length > 0) {
				return false;
			}
			$util.resetFileInput();
		}, 3000);

		angular.element(scope.$parent.uploadError) &&
			scope.$parent.uploadError(scope.stat);

		scope.stat.error_files = [];
		scope.stat.save_fail_files = [];
		scope.stat.crop_fail_files = [];
		scope.stat.saved_files = 0;
		scope.stat.croped_files = 0;
		scope.stat.upload_errors = 0;
	}

	/**
	 * 判断是否有没有保存的图片
	 * @method hasNotSavedPic
	 */
	$util.hasNotSavedPic = function() {
		var images = this.images;
		for (var i = 0; i < images.length; i++) {
			if (images[i].isPic && !images[i].isEdit) {
				return true;
			}
		};
		return false;
	}

	/**
	 * 为弹层显示默认的图片
	 * @param {scope} scope
	 * @method _setDefaultImages
	 */
	$util._setDefaultImages = function(scope) {
		for (var i = 0; i < scope.maxNum; i++) {
			scope.images.push({
				source: scope.$parent.envImgHost + '/no-piture.png',
				isPic: false,
				isHover: false,
				isEdit: false,
				isAva: true,
			});
		}
	}

	/**
	 * 获取被裁切图片上面的九宫格
	 * @method _getCropBox
	 */
	$util._getCropBox = function(config) {
		var pictureLine = config.pictureLine;
		return $util._getElement(pictureLine);
	}

	/**
	 * 获取被裁切图片的对象
	 * @method _getImageO
	 */
	$util._getImageO = function(scope) {
		var cropImageTargetSelector = scope.cropImageTargetSelector;
		return $util._getElement(cropImageTargetSelector);
	}

	/**
	 * 显示loading
	 * @method showLoading
	 */
	$util.showLoading = function(scope) {
		scope.loading = true;
	}

	/**
	 * 掩藏loading
	 * @method hideLoading
	 */
	$util.hideLoading = function(scope) {
		scope.loading = false;
	}

	return $util;
});

uploader.directive('imagecrop', function($settings, $util, $timeout, fileUploaderService) {
	return {
		restrict: 'AE',
		controller: function($scope) {
			/**
			 * 初始化图片裁切组件
			 * @param {cropCons} 裁切框的长宽
			 * @param {_originImage} 原始图片的对象
			 * @method initCrop
			 
			 */
			this.initCrop = function(scope, fileKey, callback2) {
				var source = scope.curImage.source,
					self = this;

				_setOriginImage(source, fileKey, callback2, function(img, fileKey, callback2) {
					params.oriWidth = parseFloat(img.naturalWidth || img.width);
					params.oriHeight = parseFloat(img.naturalHeight || img.height);

					// console.log('params.oriWidth:' + params.oriWidth);
					// console.log('params.oriHeight:' + params.oriHeight);
					var cropImageTarget = $util._getImageO(scope);

					self._refresh.call(cropImageTarget);

					_loadImage(scope, fileKey);

					attachEvents(scope);

					bindEventsForBar(scope);

					callback2 && callback2();
				});
			};

			/**
			 * 根据开发者自定义的宽高，计算视图的高宽。原则：定宽
			 * 如自定义的宽大于默认视图的宽，则计算其的比例，得出视图的高；反之，则将视图的宽高设置为自定义的宽高；
			 * @method _calView
			 */
			var _calView = function(scope) {
				var defaultCropW = parseFloat($settings.cropBoxWidth);

				params.cropW = parseFloat(scope.cropCons.cropW);
				params.cropH = parseFloat(scope.cropCons.cropH);
				params.ratio = defaultCropW / params.cropW;

				if (params.cropW >= defaultCropW) {
					params.viewW = defaultCropW;
					params.viewH = params.cropH * params.ratio;
				} else {
					params.viewW = params.cropW;
					params.viewH = params.cropH;
				}
			}

			this._checkPicAva = function(scope, source) {
				var originImage = _setOriginImage(source, function() {
					params.oriWidth = parseFloat(originImage.width);
					params.oriHeight = parseFloat(originImage.height);

					_calView(scope);

					_calculateImageWH();

					getMaxScaleByMaxPixel();

					var realScale = params.scale / params.ratio;
					if (!_checkScale(realScale)) {
						return false;
					}
					return true;
				});
			}

			/**
			 * 根据页面的样式，布局和宽高，初始化视图的高宽
			 * @method _initView
			 */
			this.initView = function(scope) {
				_calView(scope);

				var cropBox = _getElement(scope.cropConSelector);

				// control the view' height and width
				cropBox.css('width', params.viewW + 'px');
				cropBox.css('height', params.viewH + 'px');

				var avaH = parseFloat(params.viewH) / 3,
					c = $util._getCropBox(scope).children(),
					o = $util._getAllElement('.line7,.line9'),
					y = $settings.backgroundPositionY;

				for (var i = 0; i < o.length; i++) {
					var h = angular.element(o[i]).height(),
						diff = avaH - h;
					o[i].style.backgroundPositionY = y + diff + 'px';
				};
				c.css('height', avaH + 'px');
			}

			/**
			 * 获取原始图片的对象
			 * @param {cropCons} 裁切框长宽的默认值
			 * @method _setOriginImage
			 */
			var _setOriginImage = function(source, fileKey, callback2, callback) {
				var newImage = new Image();

				if ($util.browser === 'ie') {
					newImage.onreadystatechange = function() {
						if (/^(?:loaded|complete|undefined)$/.test(this.readyState)) {
							callback && callback(newImage, fileKey, callback2);
						}
					}
				} else {
					newImage.onload = function() {
						callback && callback(newImage, fileKey, callback2);
					}
				}
				newImage.src = source;

				return newImage;
			}

			/**
			 * 为图片裁切组件加上事件
			 * @method attachEvents
			 */
			var attachEvents = function(scope) {
				var $scropBox = $util._getCropBox(scope),
					$images = $util._getImageO(scope);

				$images.onselectstart = function() {
					return false;
				}

				document.body.onselectstart = document.body.ondrag = function() {
					return false;
				}

				$scropBox.bind('mousedown', function(event) {
					if (getEditStatus(scope)) {
						return false;
					}

					var e = event ? event : window.event;
					e.preventDefault();

					params.currentX = e.pageX;
					params.currentY = e.pageY;

					params.flag = true;

					//防止IE文字选中，有助于拖拽平滑
					$scropBox.onselectstart = function() {
						return false;
					}
					return false;
				});

				$scropBox.bind('mouseup', function(event) {
					if (getEditStatus(scope)) {
						return false;
					}

					var e = event ? event : window.event;

					params.currentX = e.pageX;
					params.currentY = e.pageY;

					params.flag = false;
					// 防止IE文字选中，有助于拖拽平滑
					$scropBox.onselectstart = function() {
						return false;
					}
					return false;
				});

				angular.element(document).bind('mouseup', function() {
					if (getEditStatus(scope)) {
						return false;
					}
					params.flag = false;

					document.onselectstart = function() {
						return false;
					}
				});

				$scropBox.bind('mousemove', function(event) {
					if (getEditStatus(scope)) {
						return false;
					}
					var e = event ? event : window.event;
					e.preventDefault();
					if (params.flag) {
						var cropImageTarget = $util._getImageO(scope),
							nowX = e.pageX,
							nowY = e.pageY,
							disX = nowX - params.currentX,
							disY = nowY - params.currentY;
						params.currentX = nowX;
						params.currentY = nowY;

						var left = cropImageTarget.css('marginLeft') || 0,
							top = cropImageTarget.css('marginTop') || 0;

						// console && console.log('left: ' + left + '\n top : ' + top);
						// console && console.log('disX: ' + disX + '\n disY : ' + disY);

						cropImageTarget.css('marginLeft', parseFloat(left) + disX + "px")
						cropImageTarget.css('marginTop', parseFloat(top) + disY + "px");

						_checkCropBounary(cropImageTarget);

						$scope.result.offsetX = _getOppositeNum(parseFloat($images.css('marginLeft')) / params.ratio);
						$scope.result.offsetY = _getOppositeNum(parseFloat($images.css('marginTop')) / params.ratio);
					}
				});

			};

			/**
			 * 为图片裁切组件中Bar加上拖动的事件
			 * @method attachEvents
			 */
			var bindEventsForBar = function(scope) {
				var bar = $util._getElement(scope.froadUploaderIcon),
					zoomBox = $util._getElement(scope.zoomBox),
					zoomContainer = $util._getAllElement(scope.zoomBtn);

				params.lenBar = parseFloat($settings.BarHeight);
				params.initHeight = bar.parent().height();
				params.realH = params.lenBar - params.initHeight;

				bar.bind('mousedown', function(event) {
					if (getEditStatus(scope) || getAvaStatus(scope)) {
						return false;
					}
					var e = event ? event : window.event;
					e.preventDefault();

					params.barY = e.clientY;
					params.currentH = this.parentElement.clientHeight;

					params.move = true;

					//防止IE文字选中，有助于拖拽平滑
					bar.onselectstart = function() {
						return false;
					}
					return false;
				});

				bar.bind('mouseup', function(event) {
					if (getEditStatus(scope) || getAvaStatus(scope)) {
						return false;
					}
					var e = event ? event : window.event;

					params.barY = e.clientY;

					params.move = false;
					// 防止IE文字选中，有助于拖拽平滑
					bar.onselectstart = function() {
						return false;
					}
					return false;
				});

				zoomContainer.bind('mouseup', function() {
					if (getEditStatus(scope) || getAvaStatus(scope)) {
						return false;
					}
					params.move = false;
					// 防止IE文字选中，有助于拖拽平滑
					bar.onselectstart = function() {
						return false;
					}
					return false;
				});


				zoomContainer.bind('mousemove', function(event) {
					if (getEditStatus(scope) || getAvaStatus(scope)) {
						return false;
					}
					var e = event ? event : window.event;

					if (params.move) {
						var diff = params.barY - e.clientY,
							nowY = params.currentH + diff,
							limitScale = getPerDistanceScale();
						// console && console.log('params.barY:' + params.barY);
						// console && console.log('e.pageY:' + e.pageY);
						// console && console.log('limitScale:' + limitScale);

						// 根据nowY的规则，重新获取Diff
						diff = _regetDiff(nowY, diff);
						// 根据nowY的规则，重新获取nowY
						nowY = _checkNowY(nowY);

						params.barY = e.clientY;
						params.currentH = nowY;
						zoomBox.css('height', nowY + 'px');

						var per = diff / limitScale,
							newScale = params.scale + per;
						// console && console.log('per:' + per);

						params.scale = newScale;
						var realScale = params.scale / params.ratio;

						if (!_checkScale(realScale)) {
							return false;
						}

						$scope.result.scale = realScale * 100 || 1;
						// console && console.log('newScale:' + $scope.result.scale);

						var imageO = $util._getImageO(scope);
						_zoom.call(imageO);
					}
				});

				// image.bind('click', function(event) {
				// 	var e = event ? event : window.event;
				// 	console && console.log('offsetY:' + event.offsetY)
				// });
			}

			var getEditStatus = function(scope) {
				if (!scope.curImage) {
					return true;
				}
				return scope.curImage.isEdit;
			}

			var getAvaStatus = function(scope) {
				if (!scope.curImage) {
					return false;
				}
				return !scope.curImage.isAva;
			}

			/**
			 * 通过Scale的最大值和最小值得到差，然后用bar的真实高度/差，得到1倍所代表的PX
			 * @method getPerDistanceScale
			 */
			var getPerDistanceScale = function() {
				var diff = params.maxScale - params.minScale;
				// console && console.log('max-min:' + diff);
				// console && console.log('ratio:' + params.ratio);
				return (params.realH / params.ratio) / diff;
			}

			/**
			 * 因七牛限制图片的像素不能超过2500万，所以得通过最大限制的像素计算最大能放大的倍数
			 * @method getMaxScaleByMaxPixel
			 */
			var getMaxScaleByMaxPixel = function() {
				var scale = Math.sqrt(params.maxPixel / (params.oriWidth * params.oriHeight));
				params.maxScale = Math.min(scale, 10);
				return params.maxScale;
			}

			/**
			 * 根据nowY的规则，重新获取diff值
			 * @param {nowY} 当前的height
			 * @param {nowY} 当前的diff
			 * @method regetDiff
			 */
			var _regetDiff = function(nowY, diff) {
				if (nowY < params.initHeight) {
					return diff - (params.initHeight - nowY);
				}
				if (nowY > params.lenBar) {
					return diff - (nowY - params.lenBar);
				}
				return diff;
			}

			/**
			 * 检查nowY的值，是否超过规则（14-288）
			 * @param {nowY} 当前的height
			 * @method _checkNowY
			 */
			var _checkNowY = function(nowY) {
				if (nowY <= params.initHeight) {
					params.move = false;
					return params.initHeight;
				}
				if (nowY >= params.lenBar) {
					params.move = false;
					return params.lenBar;
				}
				params.move = true;
				return nowY;
			}

			/**
			 * 加载被裁剪的图片
			 * @method _loadImage
			 */
			var _loadImage = function(scope, fileKey) {
				var t = $util._getImageO(scope);

				// set source for crop image box
				t.attr('src', scope.curImage.source);
				t.attr('scale', params.scale);

				// 计算图片的宽高
				_calculateImageWH();

				t.css('width', params.cropRatioW + 'px');
				t.css('height', params.cropRatioH + 'px');

				params.minScale = params.scale / params.ratio;

				// reset the max scale
				getMaxScaleByMaxPixel();

				// FIX Bug: in case the measure of file is too small, the crop action will fail(Just compromise as the implement of QiNiu [0, 1000])
				if (!_checkScale(params.minScale)) {
					scope.curImage.isAva = false;
					$util._handleErr(scope, scope.TIPS_MSG.FILE_WH_UNAVA);
					return false;
				}

				$scope.result = {
					width: params.cropW,
					height: params.cropH,
					offsetX: params.X,
					offsetY: params.Y,
					scale: (params.scale / params.ratio) * 100 || 1,
					forceSize: 0,
					fileKey: fileKey
				};

				$scope.viewH = params.viewH;
				$scope.viewW = params.viewW;
			}

			/**
			 * 裁剪图片
			 * @method _zoom
			 */
			var _zoom = function() {
				var curW = parseFloat(this.css('width')),
					curH = parseFloat(this.css('height')),
					newW = params.scale * params.oriWidth,
					newH = params.scale * params.oriHeight,
					marginLeft = parseFloat(this.css('marginLeft')),
					marginTop = parseFloat(this.css('marginTop')),
					diffW = newW - curW,
					diffH = newH - curH;

				this.css('width', Math.abs(newW) + 'px');
				this.css('height', Math.abs(newH) + 'px');
				this.css('marginLeft', marginLeft - (diffW / 2) + 'px');
				this.css('marginTop', marginTop - (diffH / 2) + 'px');

				_checkCropBounary(this);
				this.attr('scale', params.scale);

				$scope.result.offsetX = _getOppositeNum(parseFloat(this.css('marginLeft')) / params.ratio);
				$scope.result.offsetY = _getOppositeNum(parseFloat(this.css('marginTop')) / params.ratio);
			}

			/**
			 * 获取视图宽度与开发者自定义的裁切框宽度的比例
			 * @method _getRatioCropBoxAndViewW
			 */
			var _getRatioCropBoxAndViewW = function() {
				return params.cropW / parseFloat(params.viewW);
			}

			/**
			 * 获取视图高度与开发者自定义的裁切框高度的比例
			 * @method _getRatioCropBoxAndViewH
			 */
			var _getRatioCropBoxAndViewH = function() {
				return params.cropH / parseFloat(params.viewH);
			}

			/**
			 * 获取原始图高度与宽度的比例：为了比较高度和宽度的值
			 * @method _getRatioWH
			 */
			var _getRatioWH = function() {
				return params.oriWidth / params.oriHeight;
			}

			/**
			 * 计算图片在视图中的高宽
			 * 如图片过小，则需要放大图片；如图片过大，则需要缩小图片。以小的为准
			 * @method _calculateImageWH
			 */
			var _calculateImageWH = function() {
				var MaxCropBoxW = parseFloat(params.viewW),
					MaxCropBoxH = parseFloat(params.viewH);

				if (_getRatioWH() === 1) { // 原图的宽高一样
					params.scale = 1 / (params.oriWidth / MaxCropBoxW);

					params.cropRatioW = MaxCropBoxW;
					params.cropRatioH = MaxCropBoxH;

				} else if (_getRatioWH() < 1) { // 原图的宽小于原图的高
					params.scale = 1 / (params.oriWidth / MaxCropBoxW);

					params.cropRatioW = MaxCropBoxW;
					params.cropRatioH = params.oriHeight * params.scale || MaxCropBoxH;

					// 缩放之后，图片的高度小于视图的高度，则不调整缩放
					if (params.cropRatioH < params.viewH) {
						params.cropRatioH = params.oriHeight;
						params.scale = 1;
					}

				} else { // 原图的宽大于原图的高
					params.scale = 1 / (params.oriHeight / MaxCropBoxH);

					params.cropRatioH = MaxCropBoxH;
					params.cropRatioW = params.oriWidth * params.scale || MaxCropBoxW;

					// 缩放之后，图片的宽度小于视图的宽度，则不调整缩放
					if (params.cropRatioW < params.viewW) {
						params.cropRatioW = params.oriWidth;
						params.scale = 1;
					}
				}
			}

			/**
			 * 检查倍数是否合理：1 < scale < 2
			 * @param {scale} 需要被检查的倍数
			 * @method _checkZoom
			 */
			var _checkScale = function(scale) {
				if (scale < params.minScale) {
					return false;
				}

				if (scale > params.maxScale) {
					return false;
				}
				return true;
			}

			/**
			 * 获取相反的值(1 -> -1 / -1 -> 1)
			 * @param {num}
			 * @method _getOppositeNum
			 */
			var _getOppositeNum = function(num) {
				return Number(num) > 0 ? Number('-' + num) : Math.abs(num);
			}

			/**
			 * 计算图片实际的缩放，移动的比例（因图片会有移动，缩放）。e.g. 图片缩小1倍，当你移动10px,相当于移动了20px;
			 * @param {coord} 图片移动的X,Y
			 * @method _setCoords
			 */
			var _setCoords = function(coord) {
				return Math.abs(parseFloat(coord) * params.scale * _getRatioCropBoxAndViewW());
			}

			/**
			 * 拖动的时候或者缩放的时候 检查marginLeft和marginTop的值是否合理
			 * marginLeft的最大值不能超过（图片宽度-裁剪框宽度）
			 * marginTop的最大值不能超过（图片高度-裁剪框高度）
			 * @method _checkCropBounary
			 */
			var _checkCropBounary = function(cropImageTarget) {
				var $cropImage = cropImageTarget,
					curImgLeft = parseFloat($cropImage.css('marginLeft')),
					curImgTop = parseFloat($cropImage.css('marginTop')),
					curImgW = parseFloat($cropImage.css('width')),
					curImgH = parseFloat($cropImage.css('height')),
					ratioCropW = parseFloat($settings.cropBoxWidth),
					ratioCropH = parseFloat(params.cropRatioH),
					// maxLeft = (curImgW || params.oriWidth) - ratioCropW,
					// maxTop = (curImgH || params.oriHeight) - ratioCropH;
					maxLeft = curImgW - params.viewW,
					maxTop = curImgH - params.viewH;


				if (Math.abs(curImgLeft) >= Math.abs(maxLeft)) {
					$cropImage.css('marginLeft', _getOppositeNum(maxLeft) + 'px');
				} else {
					curImgLeft > 0 ? $cropImage.css('marginLeft', '0px') : '';
				}

				if (Math.abs(curImgTop) >= Math.abs(maxTop)) {
					$cropImage.css('marginTop', _getOppositeNum(maxTop) + 'px');
				} else {
					curImgTop > 0 ? $cropImage.css('marginTop', '0px') : '';
				}

				params.X = _setCoords($cropImage.css('marginLeft'));
				params.Y = _setCoords($cropImage.css('marginTop'));
			}

			/**
			 * 重新设置图片的长宽和坐标
			 * @method _refresh
			 */
			this._refresh = function() {
				this.css('marginLeft', '0px');
				this.css('marginTop', '0px');
				this.css('width', params.oriWidth + 'px');
				this.css('height', params.oriHeight + 'px');
				this.attr('src', '');

				params.X = 0;
				params.Y = 0;
				params.scale = 0;
				params.currentX = 0;
				params.currentY = 0;
			}

			/**
			 * 通过选择器得到Jquery Lite对象
			 * @param {selector}
			 * @method _getElement
			 */
			var _getElement = function(selector) {
				return angular.element(document.querySelector(selector));
			}

			// 图片裁剪组件的默认值
			var params = {
				currentX: 0,
				currentY: 0,
				flag: false,
				scale: 1,
				minScale: 0,
				maxScale: 10,
				maxPixel: 25000000,
				X: 0,
				Y: 0
			};

		}
	}
});

uploader.constant('$settings', {
	cropImageTargetSelector: 'file-uploader-crop-img',
	cropConSelector: 'file-uploader-box',
	selectImageAttr: '.file_uploader_input',
	editTargetSelector: '#edit',
	zoomInSelector: '#zoomIn',
	zoomOutSelector: '#zoomOut',
	pictureLine: 'picture-line',
	froadUploaderIcon: 'froad-uploader-icon',
	zoomBox: 'zoom-fon',
	zoomBtn: 'zoom-btn',
	formSelector: 'uploader-form',
	hideClass: 'hide-none',
	popupContainer: '.bomb-box',
	cropBoxWidth: '363px', // 默认视图框的长度
	BarHeight: '288px',
	backgroundPositionY: 101, // 裁剪框中背景图片posY的默认值
	uploadUrl: 'https://up.qbox.me/',
	QNmageHost: 'https://dn-fis.qbox.me/',
	imgHostDev: '//dev2s.sqyh365.cn/admin/merchant/control/uploader'
		// apiHost: '//dev2.ubank365.com/api/merchant'
});

uploader.directive('fileuploader', function(uploaderSettings, ajaxUploader, singlerUploader, flashUploader, $util, $settings, $timeout, $sce) {
	return {
		restrict: 'AE',
		scope: {
			maxFileSize: '@',
			minFileSize: '@',
			isMultiple: '@',
			target: '@',
			askAuthUrl: '=askKey',
			cropUrl: '=cropUrl',
			fileTypes: '=fileType',
			imageHost: '=imageHost',
			cropCons: '=cropCons',
			getMaxNum: '&'
		},
		require: ['fileuploader', '^?imagecrop'],
		controller: 'uploaderController',
		controllerAs: 'uploader',
		templateUrl: 'templates/fileUploaderTpl.html',
		replace: true,
		link: function(scope, element, attrs, ctrls) {
			scope.imageCropCtrl = ctrls[1];
			var target = $util._getElement('#' + scope.target);

			/**
			 * 初始化上传组件
			 * @method init
			 */
			var init = function() {
				if (_checkRequiredParams()) {
					return false;
				}

				_setParams();
				_initError();
				_resetClass();
				if (!$util._checkTridentV()) {
					ajaxUploader.initAjaxUploader.call(scope, target);
				} else {
					$timeout(function() {
						flashUploader.swfupload.call(scope, target);
					});
				}
				// else if (!scope.isMultiple) {
				// 	$timeout(function() {
				// 		singlerUploader.initUploaderSingle.call(scope, target);
				// 	});
				// } 
			}

			/**
			 * 初始化全局参数
			 * @method _setParams
			 */
			var _setParams = function() {
				// scope = {};
				// 设置是否支持多张图片上传
				scope.isMultiple = attrs.$attr.multiple ? true : false;
				// 设置图片是否支持裁切功能
				scope.imagecrop = attrs.$attr.imagecrop ? true : false;
				// 回显图片的List
				scope.images = [];

				scope.curImage = {
					source: scope.$parent.envImgHost + '/no-piture.png',
					isPic: false,
					isHover: false,
					isEdit: false,
					isAva: true,
				};
				// 控制组件的显示
				scope.visible = false;
				// 控制组件内的弹层的显示
				scope.dialog = false;
				// 控制组件内的弹层中是否显示按钮
				scope.bnts = true;
				// 控制组件外的弹层中是否显示按钮
				scope.dialogOut = false;
				// 控制整个组件外是否为loading
				scope.loading = false;
				// 控制整个组件内是否为loading
				scope.loadingInside = false;
				// 控制整个组件内是否为loading
				scope.yesFunc = '';

				scope.barIconUrl = scope.$parent.envImgHost + '/line-btn.png';
				// 设置文件大小的最大值和最小值
				scope.maxFileSize = $util.transferFileSize(scope.maxFileSize);
				scope.minFileSize = $util.transferFileSize(scope.minFileSize);

				var settings = angular.extend(uploaderSettings, scope);
			}

			/**
			 * 检查必需参数
			 * @method _checkRequiredParams
			 */
			var _checkRequiredParams = function() {
				if (!scope.$parent.askAuthUrl) {
					$util._handleErr(scope, scope.TIPS_MSG.LESS_AUTH_URL);
					return true;
				}

				if (!scope.$parent.imageHost) {
					$util._handleErr(scope, scope.TIPS_MSG.LESS_IMAGE_HOST);
					return true;
				}

				if (!scope.$parent.cropUrl) {
					$util._handleErr(scope, scope.TIPS_MSG.LESS_CROP_URL);
					return true;
				}

				if (!scope.$parent.saveUrl) {
					$util._handleErr(scope, scope.TIPS_MSG.LESS_CROP_URL);
					return true;
				}

				return false;
			}

			var _resetClass = function() {
				var o = {
					pictureLine: $settings.pictureLine,
					froadUploaderIcon: $settings.froadUploaderIcon,
					zoomBox: $settings.zoomBox,
					zoomBtn: $settings.zoomBtn,
					cropImageTargetSelector: $settings.cropImageTargetSelector,
					formSelector: $settings.formSelector,
					cropConSelector: $settings.cropConSelector
				}

				for (var i in o) {
					o[i] = '[data=' + o[i] + '-' + scope.target + ']';
				};
				angular.extend(scope, o);
			}

			var _initError = function() {
				scope.QUEUE_ERROR = {
					//文件大小超过限制;
					FILE_EXCEEDS_SIZE_LIMIT: -110,

					//不是指定类型文件;
					INVALID_FILETYPE: -130
				};

				scope.TIPS_MSG = {
					LAST_IMAGES_LEFT: '删除最后一张，将关闭上传组件',
					NONE_IMAGE: '请选择图片',
					NOT_SAVE_PIC: '你还未保存图片,你确定要关闭吗?',
					SAVE_FAIL: '保存图片失败',
					SAVE_SUCCESS: '保存图片成功',
					CROP_FAIL: '裁切图片失败',
					FILE_SIZE_EXCEED: '上传图片大小超过限制',
					// FILE_SIZE_LESS_MIN: '上传图片大小不符合上传条件',
					FILE_TYPES_EXCEED: '上传图片文件不符合要求',
					UPLOAD_FAIL: '文件上传失败',
					LESS_CROP_URL: '缺少裁切接口',
					LESS_AUTH_URL: '缺少授权接口',
					LESS_IMAGE_HOST: '缺少图片HOST',
					LESS_SAVE_URL: '缺少保存接口',
					SAVING_STATUS: '正在保存中...',
					FILE_NUMBER_EXCEED: '上传图片数量超过限制',
					FILE_WH_UNAVA: '图片尺寸不符合裁切规则，请删除',
					REMOVE_IMAGE_CONFIRM: '确认是否要删除该图片',
				};

				//记录队列状态;
				scope.stat = {
					//加入队列的文件数量;
					files_queued: 0,

					//成功上传的文件数量;
					successful_uploads: 0,

					//上传失败的文件数量;
					upload_errors: 0,

					//加入队列失败的文件数量;
					queue_errors: 0,

					// 保存失败的图片;
					save_fail_files: [],

					crop_fail_files: [],

					// 已保存成功的文件数量
					saved_files: 0,

					// 已裁切成功的文件数量
					croped_files: 0,

					// 失败文件名的集合
					error_files: [],

					saved_images: []
				}
			}

			init();
		}
	}
});

uploader.constant('uploaderSettings', {
	maxFileSize: 4 * 1028 * 1028,
	minFileSize: 1028 * 1028,
	fileTypes: '*.jpg;*.gif;*.jpeg;*.png;*.bmp',
	imageCrop: true,
	isMultiple: true,
	maxNum: 5,
	cropCons: {
		cropW: '300px',
		cropH: '300px'
	}
});

angular.module("templates/fileUploaderTpl.html", []).run(["$templateCache", function($templateCache) {
	$templateCache.put("templates/fileUploaderTpl.html",
		'<div>' +
		'<form name="uploader-form" data="uploader-form-{{target}}" method="post" action="https://up.qbox.me/" enctype="multipart/form-data" target="LBFUPLOADER" style="display: none;">' +
		'<input type="file" name="file" class="file_uploader_input" style="visibility:hidden;" ng-click="getMaxNum();"/>' +
		'<input type="submit" value="Submit" id="submit" style="visibility:hidden;"/>' +
		'</form>' +
		'<div class="code-box" ng-class={false:"hide-none"}[visible]>' +
		'<p class="editor-piture"><span>编辑图片</span><span class="close" ng-click="close();"></span></p>' +
		'<div class="overflow-auto-ed"><div class="code-pic">' +
		'<div ng-repeat="image in images" class="picture-frame frame-editor">' +
		'<div><img ng-src="{{image.source}}" data-fileKey="{{image.fileKey}}"></div>' +
		'<div class="picture-delect" ng-if="image.isPic && !image.isEdit && image.isHover"></div>' +
		'<div class="picture-place" ng-mouseenter="hoverin($event)" ng-mouseleave="hoverout($event);">' +
		'<div class="picture-editor hide-none" ng-if="image.isPic && !image.isEdit && image.isHover" ng-click="loadCropImage($event, $index)" data-source="{{image.source}}">' +
		'<a href="javascript:void(0);">点击编辑</a>' +
		'</div>' +
		'<div class="delect-scon" ng-if="image.isPic">' +
		'<a href="javascript:void(0);" ng-click="remove($index);"></a>' +
		'</div>' +
		'</div>' +
		'<div ng-class={true:"picture-editor-succe"}[image.isEdit]></div>' +
		'</div>' +
		' </div>' +
		'<div class="picture-manege">' +
		'<div class="eject image-flow file-uploader-box" data="file-uploader-box-{{target}}">' +
		'<img ng-src="{{curImage.isEdit ? curImage.testImage : curImage.source}}" class="file-uploader-crop-img" data="file-uploader-crop-img-{{target}}">' +
		'<p class="note">通过拖动图片和滑竿来编辑图片</p>' +
		'</div>' +
		'<div class="picture-line" data="picture-line-{{target}}">' +
		'<div class="line1"></div>' +
		'<div class="line2"></div>' +
		'<div class="line3"></div>' +
		'<div class="line4"></div>' +
		'<div class="line5"></div>' +
		'<div class="line6"></div>' +
		'<div class="line7"></div>' +
		'<div class="line8"></div>' +
		'<div class="line9"></div>' +
		'</div>' +
		'<div class="zoom-line">' +
		'<div class="zoom-line">' +
		'<p class="large"><span class="zoom-large">放大</span></p>' +
		'<div class="zoom-btn" data="zoom-btn-{{target}}">' +
		'<div class="zoom-gre" data="zoom-gre-{{target}}"></div>' +
		'<div class="zoom-fon" data="zoom-fon-{{target}}">' +
		'<img ng-src="{{barIconUrl}}"  class="froad-uploader-icon" data="froad-uploader-icon-{{target}}"/>' +
		'</div>' +
		'<div class="scon-top"></div>' +
		'<div class="scon-bot"></div>' +
		'</div>' +
		'<p class="litter"><span class="zoom-litte">缩小</span></p>' +
		'</div>' +
		'</div>' +
		'<div class="zoom-editor" ng-class={true:"zoom-succes"}[curImage.isEdit]>' +
		'<a href="javascript:void(0);" ng-click="edit();"></a>' +
		'</div>' +
		'</div>' +
		'<div class="foot-confirm">' +
		'<span>确定所有图片编辑成功即可点击</span>' +
		'<button class="btn" ng-click="save();">保存</button>' +
		'</div>' +
		'<div class="editor-pict-loading" ng-class={false:"hide-none"}[dialog]></div>' +
		'<div class="bomb-box" ng-class={false:"hide-none"}[dialog]>' +
		'<div class="bomb-pic">' +
		'<p>{{MSG}}</p>' +
		'<div class="bomb-firm" ng-class={false:"hide-none"}[btns]>' +
		'<button class="btn yes" ng-click="yes();">确定</button>' +
		'<button class="btn btn-color no" ng-click="no();">取消</button>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'<div class="stop-editor-back" ng-class={false:"hide-none"}[dialogOut]>' +
		'<div class="bomb-box bomb-box-fix">' +
		'<div class="bomb-pic">' +
		'<p>{{MSG}}</p>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'<div class="stop-editor-back" ng-class={false:"hide-none"}[loading]>' +
		'<div class="loading-pic"></div>' +
		'</div>' +
		'<div class="stop-editor-back" ng-class={false:"hide-none"}[visible]>' +
		'</div>' +
		'<div class="editor-pict-loading" ng-class={false:"hide-none"}[loadingInside]></div>' +
		'<div class="loading-picture" ng-class={false:"hide-none"}[loadingInside]></div>' +
		'</div>' +
		"");
}]);