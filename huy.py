import numpy as np

import numpy as np

arr1 = np.array([[1, 2, 3], [4, 5, 6]])
arr2 = np.array([[7, 8, 9], [10, 11, 12]])
newarr = np.stack((arr1, arr2), axis=2)
print(newarr)