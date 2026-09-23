export function sift_up<T>(container: Array<T>, index: number, less: (a: T, b: T) => boolean) {
    if (index == 0) {
        return;
    }

    const parent = (index - 1) >> 1;

    if (less(container[index], container[parent])) {
        const temp = container[index];
        container[index] = container[parent];
        container[parent] = temp;

        sift_up(container, parent, less);
    }
}

export function sift_down<T>(container: Array<T>, index: number, less: (a: T, b: T) => boolean, length: number = -1) {
    if (length == -1) {
        length = container.length;
    }

    const left = 2 * index + 1;
    const right = 2 * index + 2;

    if (right < length) {
        const min = less(container[left], container[right]) ? left : right;

        if (less(container[min], container[index])) {
            const temp = container[min];
            container[min] = container[index];
            container[index] = temp;

            sift_down(container, min, less, length);
        }
    }
    else if (left < length) {
        if (less(container[left], container[index])) {
            const temp = container[left];
            container[left] = container[index];
            container[index] = temp;

            sift_down(container, left, less, length);
        }
    }
}

export function insert<T>(container: Array<T>, element: T, less: (a: T, b: T) => boolean) {
    container.push(element);
    sift_up(container, container.length - 1, less);
}

export function erase<T>(container: Array<T>, index: number, less: (a: T, b: T) => boolean) {
    const last = container.length - 1;

    if (index == last) {
        container.pop();
        return;
    }

    container[index] = container[last];
    container.pop();

    const parent = (index - 1) >> 1;

    if (index > 0 && less(container[index], container[parent])) {
        sift_up(container, index, less);
    }
    else {
        sift_down(container, index, less);
    }
}

export function partial_heapsort<T>(container: Array<T>, ptr: number, count: number, less: (a: T, b: T) => boolean): {sorted: Array<T>, ptr: number} {
    const result = [];

    for (let i = 0; ptr >= 0 && i < count; i++, ptr--) {
        const last = container[ptr];
        container[ptr] = container[0];
        container[0] = last;

        result.push(container[ptr]);
        sift_down(container, 0, less, ptr);
    }

    return {sorted: result, ptr: ptr};
}

export function heapify<T>(container: Array<T>, less: (a: T, b: T) => boolean) {
    for (let i = (container.length - 1) >> 1; i >= 0; i--) {
        sift_down(container, i, less);
    }
}