import numpy as np

arr = np.array([1, 2, 3, 4, 5])
print(arr)
arr1 = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
print(arr1[0,2])

arr2 = np.array([[[1, 2, 3], [4, 5, 6]], [[7, 8, 9], [10, 11, 12]]])
print(arr2[1, 0,1])

arr3 = np.array([1, 2, 3, 4, 5])
x = arr.copy()
y = arr.view()
arr[0] = 10
print(x)
print(y)

for x in np.nditer(arr2):
    print(x)

for x in np.ndenumerate(arr2):
    print(x)