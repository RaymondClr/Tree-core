var Tree = function () {
    var root = this;

    var global = $.global;

    var tree = { version: 'alpha 0.0.3' };

    var windowKeeper = [];

    var arrayProto = Array.prototype,
        objectProto = Object.prototype;

    var hasOwnProperty = objectProto.hasOwnProperty,
        nativeConcat = arrayProto.concat,
        nativeObjectToString = objectProto.toString,
        nativeSlice = arrayProto.slice;

    var reEscapeNumber = /\d/g;

    var layoutModeFlags = [0, 1, 2];

    var validContainerType = ['dialog', 'palette', 'window'];

    var mainContainerDefault = { dockable: true, show: true, singleton: false };

    var controlParamRef = { button: 3, checkbox: 3, dropdownlist: 3, edittext: 3, iconbutton: 3, image: 3, listbox: 3, progressbar: 4, radiobutton: 3, scrollbar: 5, slider: 5, statictext: 3, treeview: 3 },
        containerParamRef = { group: 2, panel: 3, tab: 3, tabbedpanel: 3 };

    var elementTypeFlags = { button: 'A', checkbox: 'B', dialog: 'C', dropdownlist: 'D', edittext: 'E', group: 'G', iconbutton: 'H', image: 'I', item: 'J', listbox: 'K', node: 'L', palette: 'M', panel: 'N', progressbar: 'O', radiobutton: 'P', scrollbar: 'Q', slider: 'R', statictext: 'S', tab: 'T', tabbedpanel: 'U', treeview: 'V', window: 'W' };

    var reCombination = /[CGMNTW][ABDEFGHIKNOPQRSUV]|[DK]J|[VL][LJ]|UT/,
        reContainer = /[DGKLNTUV]/,
        reListItemContainer = /[DKLV]/,
        reSelectableElement = /[DKUV]/,
        reNativeContainer = /[GNTU]/,
        reNativeControl = /[ABDEFHIKOPQRSV]/;

    var isContainer = createIsElementType(reContainer),
        isListItemContainer = createIsElementType(reListItemContainer),
        isNativeContainer = createIsElementType(reNativeContainer),
        isNativeControl = createIsElementType(reNativeControl),
        isSelectableElement = createIsElementType(reSelectableElement);

    function addContainer(container, value, type, collector) {
        var func = isTypeNode(type) ? addNodeContainer : addGeneralContainer;
        return func.apply(null, arguments);
    }

    function addControl(container, value) {
        var func = isListItemContainer(container.type) ? addListItem : addGeneralControl;
        assign(func.apply(null, arguments), getElementStyle(value));
    }

    function addGeneralContainer(container, value, type, collector) {
        var style = getElementStyle(value);
        var container = nativeAddContainer(container, type, assignElementParam(value, type));

        if (isSelectableElement(type) && has(style, 'selection')) {
            collector.selectableElement.push({ container: container, itemIndex: style.selection });
            delete style['selection'];
            return assign(container, style);
        }

        return assign(container, getElementStyle(value));
    }

    function addGeneralControl(container, value, type, collector) {
        return nativeAddControl(container, type, assignElementParam(value, type));
    }

    function addGetElementMethods(constructors) {
        forEach(constructors, function (constructor) {
            var prototype = constructor.prototype;
            prototype.getElementById = getElementsById;
            prototype.getElementsByName = getElementsByName;
            prototype.getElementsByType = getElementsByType;
            freezeProperty(prototype, 'getElementById');
            freezeProperty(prototype, 'getElementsByName');
            freezeProperty(prototype, 'getElementsByType');
        });
    }

    function addListItem(container, value, type, collector) {
        return nativeAddNodeItem(container, getListItemParam(value));
    }

    function addNodeContainer(container, value, type, collector) {
        var style = getElementStyle(value);
        var node = nativeAddNode(container, getListItemParam(value));
        if (style.expanded) {
            collector.nodeItems.push(node);
        }
        delete style['expanded'];
        return assign(node, style);
    }

    function assign(object) {
        var args = nativeSlice.call(arguments, 1);
        forEach(args, function (source) {
            if (isObject(source)) {
                forOwn(source, function (value, key) {
                    object[key] = value;
                });
            }
        });
        return object;
    }

    function assignContext(global, dockable, isSingletonWindow) {
        if (isSingletonWindow || !dockable) {
            return Window;
        }
        if (isValidContext(root)) {
            return root;
        }
        return isValidContext(global) ? global : Window;
    }

    function assignElementParam(value, type) {
        return assignUniqueName(getElementParam(value), type);
    }

    function assignLayoutMode(setAll, setAlone) {
        if (contains(layoutModeFlags, setAlone)) {
            return setAlone;
        }
        if (contains(layoutModeFlags, setAll)) {
            return setAll;
        }
        return 0;
    }

    function assignUniqueName(param, type) {
        var nodedName = param[0];
        if (isNil(nodedName)) {
            return param;
        }
        var index = getCreationPropertiesIndex(type);
        var creationProperties = param[index];
        if (!isObject(creationProperties)) {
            param[index] = {};
        }
        if (has(creationProperties, 'name')) {
            return param;
        }
        param[index].name = nodedName;

        return param;
    }

    function assignWindowType(param) {
        var type = String(param[0]);
        param[0] = contains(validContainerType, type) ? type : ['palette'];
        return param;
    }

    function baseGetConfig(value) {
        return get(value, 'config');
    }

    function baseGetElementId(element) {
        var properties = element.properties;
        return properties && properties.name;
    }

    function baseGetListItemParam(value) {
        return get(value, 'param');
    }

    function baseGetParam(value) {
        var result = get(value, 'param');
        return isArray(result) ? mapNullToUndefined(result) : [];
    }

    function baseGetStyle(value) {
        var result = get(value, 'style');
        return isObject(result) ? result : {};
    }

    function buildNativeWindow(resource, context, showWindow, layoutMode) {
        var container = bulidElements(resource, context);
        initLayout(container, layoutMode);
        if (isWindow(container) && showWindow) {
            container.show();
        }
        return container;
    }

    function buildSingletonWindow(resource, context, showWindow, layoutMode) {
        var container = null;

        return function () {
            if (isInvisibleContainer(container)) {
                container = bulidElements(resource, context);
            }
            initLayout(container, layoutMode);
            if (isWindow(container) && showWindow) {
                container.show();
            }
            return container;
        };
    }

    function buildWindow(isSingletonWindow) {
        var func = isSingletonWindow ? buildSingletonWindow : buildNativeWindow;
        return func.apply(null, nativeSlice.call(arguments, 1));
    }

    function bulidElements(resource, context) {
        var container = initMainContainer(resource, context);
        var collector = new elementCollector();

        parseElement(resource, container, collector);

        selectChildItem(collector.selectableElement);
        expandTreeViewNodes(collector.nodeItems);

        return container;
    }

    function castArray(value) {
        return isArray(value) ? value : [value];
    }

    function clone(object) {
        return assign({}, object);
    }

    function contains(array, value) {
        var index = -1,
            length = array.length;

        while (++index < length) {
            if (array[index] === value) {
                return true;
            }
        }
        return false;
    }

    function createIsElementType(regex) {
        return function (type) {
            return regex.test(elementTypeFlags[type]);
        };
    }

    function eachElement(containers, accumulator, breaker, predicate) {
        return some(containers, function (container) {
            var result = [];
            var isDone = some(container.children, function (element) {
                if (isNativeContainer(element.type)) {
                    result.push(element);
                }
                if (predicate(element)) {
                    accumulator.push(element);
                }
                return breaker(accumulator);
            });
            return isDone ? true : eachElement(result, accumulator, breaker, predicate);
        });
    }

    function elementCollector() {
        this.nodeItems = [];
        this.selectableElement = [];
    }

    function escapeNumber(string) {
        return string.replace(reEscapeNumber, '');
    }

    function expandTreeViewNodes(nodes) {
        forEach(nodes, function (node) {
            node.expanded = true;
        });
    }

    function filterFindElementInput(input) {
        return uniq(map(nativeConcat.apply([], input), String));
    }

    function forEach(array, iteratee) {
        var index = -1,
            length = array.length;

        while (++index < length) {
            iteratee(array[index], index, array);
        }
        return array;
    }

    function forOwn(object, iteratee) {
        for (var key in object) {
            if (has(object, key)) {
                iteratee(object[key], key, object);
            }
        }
    }

    function freezeProperty(object, property) {
        object.watch(property, function (name, oldValue) {
            return oldValue;
        });
    }

    function get(object, key) {
        return isNil(object) ? undefined : object[key];
    }

    function getCreationPropertiesIndex(key) {
        if (isNativeControl(key)) {
            return controlParamRef[key];
        }
        if (isContainer(key)) {
            return containerParamRef[key];
        }
    }

    function getElementParam(value) {
        return isArray(value) ? mapNullToUndefined(value) : baseGetParam(value);
    }

    function getElementStyle(value) {
        return isArray(value) ? {} : baseGetStyle(value);
    }

    function getElementsById(targetId) {
        targetId = String(targetId);
        var result = [];

        function breaker(accumulator) {
            return accumulator.length > 0;
        }

        eachElement([this], result, breaker, function (element) {
            var elementId = baseGetElementId(element);
            if (isNil(elementId)) {
                return false;
            }
            return targetId === elementId;
        });

        return result.length === 0 ? null : result[0];
    }

    function getElementsByName() {
        targetNames = filterFindElementInput(arguments);
        var seen = [];
        var result = [];

        function breaker() {
            return targetNames.length === seen.length;
        }

        eachElement([this], result, breaker, function (element) {
            var elementId = baseGetElementId(element);
            if (isNil(elementId)) {
                return false;
            }
            return contains(targetNames, elementId) && !contains(seen, elementId) && seen.push(elementId);
        });

        return result.length === 0 ? null : result;
    }

    function getElementsByType() {
        var targetTypes = filterFindElementInput(arguments);
        var result = [];

        function breaker() {
            return false;
        }

        eachElement([this], result, breaker, function (element) {
            return contains(targetTypes, element.type);
        });

        return result.length === 0 ? null : result;
    }

    function getListItemParam(value) {
        var result = isObject(value) ? baseGetListItemParam(value) : value;
        return String(result);
    }

    function getMainContainer(param, context) {
        return isPanel(context) ? context : new Window(param[0], param[1], param[2], param[3]);
    }

    function has(object, key) {
        return hasOwnProperty.call(object, key);
    }

    function initBuildValues(resource, parserSelf) {
        var config = assign(clone(mainContainerDefault), baseGetConfig(resource));
        var showWindow = Boolean(config.show);
        var dockable = Boolean(config.dockable);
        var isSingletonWindow = Boolean(config.singleton);
        var context = assignContext(parserSelf.context, dockable, isSingletonWindow);
        var layoutMode = assignLayoutMode(parserSelf.layoutMode, config.layoutMode);
        return [isSingletonWindow, resource, context, showWindow, layoutMode];
    }

    function initLayout(container, layoutMode) {
        container.layout.layout(layoutMode);
        container.layout.resize();
    }

    function initMainContainer(resource, context) {
        var mainContainer = getMainContainer(assignWindowType(baseGetParam(resource)), context);
        mainContainer.onResizing = mainContainer.onResize = function () {
            this.layout.resize();
        };
        return assign(mainContainer, baseGetStyle(resource));
    }

    function isArray(value) {
        return nativeObjectToString.call(value) === '[object Array]';
    }

    function isInvisibleContainer(container) {
        return isNull(container) || !container.visible;
    }

    function isNil(value) {
        return value == null;
    }

    function isNull(value) {
        return value === null;
    }

    function isObject(value) {
        var type = typeof value;
        if (isNil(value)) {
            return false;
        }
        return type == 'object' || type == 'function';
    }

    function isPanel(container) {
        return container instanceof Panel;
    }

    function isTypeNode(type) {
        return type === 'node';
    }

    function isTypeTabbedpanel(type) {
        return type === 'tabbedpanel';
    }

    function isValidCombination(parentType, childType) {
        var flagCombination = elementTypeFlags[parentType] + elementTypeFlags[childType];
        return reCombination.test(flagCombination);
    }

    function isValidContext(context) {
        return context === global || isPanel(context);
    }

    function isValidElement(type) {
        return has(elementTypeFlags, type);
    }

    function isWindow(container) {
        return container instanceof Window;
    }

    function map(array, iteratee) {
        var index = -1,
            length = array.length,
            result = Array(length);

        while (++index < length) {
            result[index] = iteratee(array[index], index, array);
        }
        return result;
    }

    function mapNullToUndefined(array) {
        return map(array, function (value) {
            return isNull(value) ? undefined : value;
        });
    }

    function nativeAddContainer(container, type, param) {
        return container.add(type, param[1], param[2], param[3]);
    }

    function nativeAddControl(container, type, param) {
        return container.add(type, param[1], param[2], param[3], param[4], param[5]);
    }

    function nativeAddNode(container, param) {
        return container.add('node', param);
    }

    function nativeAddNodeItem(node, param) {
        return node.add('item', param);
    }

    function parseElement(resource, container, collector) {
        forOwn(resource, function (value, key) {
            key = escapeNumber(key).toLowerCase();
            if (isValidElement(key) && isValidCombination(container.type, key)) {
                if (isContainer(key)) {
                    var newContainer = addContainer(container, value, key, collector);
                    parseElement(value, newContainer, collector);
                } else {
                    addControl(container, value, key, collector);
                }
            }
        });
    }

    function runInContext(resource) {
        if (!isObject(resource)) {
            return null;
        }
        var container = buildWindow.apply(null, initBuildValues(resource, tree));
        windowKeeper.push(container);
        return container;
    }

    function selectChildItem(selectableElement) {
        forEach(selectableElement, function (value) {
            var container = value.container;
            var itemIndex = value.itemIndex;

            container.selection = isTypeTabbedpanel(container.type)
                ? value.itemIndex
                : map(castArray(itemIndex), function (value) {
                      return container.items[value];
                  });
        });
    }

    function some(array, predicate) {
        var index = -1,
            length = array.length;

        while (++index < length) {
            if (predicate(array[index], index, array)) {
                return true;
            }
        }
        return false;
    }

    function uniq() {
        var result = [];
        var args = nativeConcat.apply([], arguments);

        forEach(args, function (value) {
            if (!contains(result, value)) {
                result.push(value);
            }
        });
        return result;
    }

    addGetElementMethods([Window, Panel, Group]);
    tree.parse = runInContext;

    return tree;
}.call(this);
