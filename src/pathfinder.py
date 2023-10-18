"""demonstrate different pathfinding algorithm including bfs, uniform cost search, and astar"""
import sys
import math
from queue import Queue
import heapq

class Pathfinder:
    """implmentation of the 2D array based map data type and the pathfinding algorithms"""
    def __init__(self,map_file,algorithm,heuristic) -> None:
        self.file_name = map_file
        self.read_map()
        self.heuristics = None
        self.algorithm = algorithm
        self.heuristics = heuristic
        self.path = self.find_path()
        #self.print_path()

    def build_map(self) -> dict:
        """build the map from the 2D array with x, y coordinates, cost, and connected nodes

        Args:
            arr: the 2D array of the map
            obstacle (str, optional): set symbol for represent obstacle  Defaults to "X".

        Returns:
            dict: dictionary of the map in the form of map[(x, y)] = [[(x, y), cost], ...
        """
        # to get the neighbors of a node, use map[node]
        # to get the n th neighbor of a node, use map[node][#neighbour]
        # to get the cost of the edge between two nodes, use map[node][#neighbour][1]
        obstacle = "X"
        arr = self.map_array
        neighbour_list = {}
        rows = len(arr)
        cols = len(arr[0])
        for i in range(rows):
            for j in range(cols):
                node = (i, j)
                if arr[i][j] == obstacle:
                    neighbour_list[node] = []
                    continue
                neighbors = []
                if i > 0:
                    neighbors.append((i-1, j)) # up
                if i < rows-1:
                    neighbors.append((i+1, j)) # down
                if j > 0:
                    neighbors.append((i, j-1)) # left
                if j < cols-1:
                    neighbors.append((i, j+1)) # right
                for neighbor in neighbors:
                    if arr[neighbor[0]][neighbor[1]] != obstacle:
                        cost = self.calculate_cost(node, neighbor)
                        neighbour_list.setdefault(node, []).append([neighbor, cost])
                        # map[node] = sorted(map[node], key=lambda x: x[1])
        return neighbour_list

    def read_map(self) -> None:
        """get the map file name from command line argument and read the map data"""
        filename = self.file_name
        open_file = open(filename, "r", encoding="utf-8")
        assert open_file is not None, "cannot open file: " + filename
        # read and store map in a 2D array, the map is a list of list
        array = []
        line_count = 0
        for line in open_file:
            if line_count < 3:
                line = line.strip().split(" ")
                if line_count == 0:
                    self.map_size = {"x": int(line[0]), "y": int(line[1])}
                if line_count == 1:
                    self.start = {"x": int(line[0]) - 1, "y": int(line[1]) - 1}
                if line_count == 2:
                    self.goal = {"x": int(line[0]) - 1, "y": int(line[1]) - 1}
                line_count += 1
                continue
            line = line.strip()
            if line != "":
                if array is None:
                    array = []
            line = list(line)
            line = [char for char in line if char != " "]
            array.append(line)
        open_file.close()
        self.map_array = array
        # convert the array into a map with x, y coordinates, cost, and connected nodes
        self.map = self.build_map()

    def get_neighbors(self, node) -> list:
        """get the neighbors of the node

        Args:
            node: the node to get its neighbors

        Returns:
            list: the list of neighbors
        """
        # return a list of neighbors only without the cost
        neighbors = []
        for neighbor in self.map[node]:
            neighbors.append(neighbor[0])
        return neighbors

    def calculate_cost(self, node1 : tuple, node2 : tuple) -> int:
        """get the cost of the edge between node1 and node2

        Args:
            node1: the first node in tuple (x, y)
            node2: the second node in tuple (x, y)

        Returns:
            int: the cost of the edge
        """
        return 1 if self.get_elevation(node1, node2) >= 0 else 1 + abs(self.get_elevation(node1, node2))

    def get_cost(self, node: tuple, neighbour: tuple) -> int:
        """get the cost of the edge between node and neighbour

        Args:
            node: the node in tuple (x, y)
            neighbour: the neighbour in tuple (x, y)

        Returns:
            int: the cost of the edge
        """
        for neighbor in self.map[node]:
            if neighbor[0] == neighbour:
                return neighbor[1]

    def __get_height(self, node : tuple) -> int:
        """get the height of the node

        Args:
            node: the node to get its height in tuple (x, y)

        Returns:
            int: the height of the node
        """
        if self.map_array[int(node[0])][int(node[1])] == "X":
            return sys.maxsize
        return int(self.map_array[int(node[0])][int(node[1])])

    def get_elevation(self, node1, node2) -> int:
        """get the elevation change between node1 and node2

        Args:
            node1: the first node
            node2: the second node

        Returns:
            int: the elevation change
        """
        return self.__get_height(node1) - self.__get_height(node2)

    def find_path(self) -> list:
        """find the path from start to goal using the specified algorithm"""
        self.path = None
        if self.algorithm == "bfs":
            return self.bfs()
        elif self.algorithm == "ucs":
            return self.ucs()
        elif self.algorithm == "astar":
            return self.astar()
        else:
            assert False, "unknown algorithm: " + self.algorithm

    def euclidean_distance(self, current: tuple, dest: tuple) -> int:
        """helper function to calculate the euclidean distance between two nodes

        Args:
            current: the current node
            dest: the destination node

        Returns:
            int : the euclidean distance
        """
        return math.sqrt((current[0] - dest[0]) ** 2 + (current[1] - dest[1]) ** 2)

    def manhattan_distance(self, current: tuple, dest: tuple) -> int:
        """helper function to calculate the manhattan distance between two nodes

        Args:
            current: the current node
            dest: the destination node

        Returns:
            int : the manhattan distance
        """
        return (abs(current[0] - dest[0]) + abs(current[1] - dest[1]))

    def heuristic(self, node: tuple, dest: tuple) -> int:
        """calculate the heuristic value of the node

        Args:
            node: the node to calculate its heuristic value

        Returns:
            int: the heuristic value
        """
        if self.heuristics == "euclidean":
            return self.euclidean_distance(node, dest)
        elif self.heuristics == "manhattan":
            return self.manhattan_distance(node, dest)
        else:
            assert False, "unknown heuristic: " + self.heuristics

    def bfs(self) -> list:
        """implement the breadth first search algorithm

        Returns:
            list: the path from start to goal
        """
        start = tuple(self.start.values())
        goal = tuple(self.goal.values())
        current = Queue()
        current.put(start)
        explored = set()

        # Initialize the dictionary that will store the path
        path = {}
        path[start] = None

        # Search for the goal node
        while not current.empty():
            current_node = current.get()
            if current_node == goal:
                break
            for neighbor in self.get_neighbors(current_node):
                if neighbor not in explored:
                    current.put(neighbor)
                    explored.add(neighbor)
                    path[neighbor] = current_node

        # If no path is found, return None
        if goal not in path:
            return None

        # Reconstruct the path from the start to the goal node
        current_node = goal
        path_list = [current_node]
        while current_node != start:
            current_node = path[current_node]
            path_list.append(current_node)
        path_list.reverse()

        return path_list

    def ucs(self) -> list:
        """implement the uniform cost search algorithm

        Returns:
            list: the path from start to goal
        """
        start_node = tuple(self.start.values())
        goal_node = tuple(self.goal.values())
        pending = [] # priority queue of nodes that have not been visited, key is the cost to get to that node from the start node
        heapq.heappush(pending, (0, start_node)) # (cost, node), initial cost is 0 for the starting node
        visited = set() # set of nodes that have been visited, no repeat
        came_from = {} # dictionary of nodes that have been visited, key is the node, value is the parent node, kind of like linked list
        cost_so_far = {} # dictionary of nodes that have been visited, key is the node, value is the cost to get to that node from the start node

        came_from[start_node] = None # the parent of the starting node is None
        cost_so_far[start_node] = 0 # the cost to get to the starting node from the starting node is 0
        visited.add(start_node) # add the starting node to the visited set
        
        while pending and goal_node not in visited:
            current_cost, current_node = heapq.heappop(pending) # get the node with the lowest cost from the priority queue
            visited.add(current_node) # add the node to the visited set
            for next_node in self.get_neighbors(current_node): # get the neighbors of the current node
                new_cost = cost_so_far[current_node] + self.get_cost(current_node, next_node) # calculate the cost to get to the neighbor node from the start node
                if next_node not in visited or new_cost < current_cost: # if the neighbor node has not been visited or the cost to get to the neighbor node from the start node is less than the current cost to get to the neighbor node from the start node
                    cost_so_far[next_node] = new_cost # update the cost to get to the neighbor node from the start node
                    priority = new_cost # the priority of the neighbor node is the cost to get to the neighbor node from the start node
                    heapq.heappush(pending, (priority, next_node)) # add the neighbor node to the priority queue
                    came_from[next_node] = current_node # set the parent of the neighbor node to the current node
                    # remove parent of current node from pending if it is in pending and all of its children have been visited
                    if current_node in came_from and all(child in visited for child in self.get_neighbors(current_node)):
                        pending.remove((cost_so_far[current_node], current_node))

        path = []
        current_node = goal_node
        while current_node != start_node:
            path.append(current_node)
            current_node = came_from[current_node]
        path.append(start_node)
        path.reverse()
        return path

    def astar(self) -> list:
        """implement the A* search algorithm with tie priority in up, down, left, right order

        Returns:
            list: the path from start to goal
        """
        start_node = tuple(self.start.values())
        goal_node = tuple(self.goal.values())
        pending = [] # priority queue of nodes that have not been visited, key is the tuple (priority, tie_priority, node)
        heapq.heappush(pending, (0, 0, 0, 0,start_node)) # (priority, batch_number, tie_priority, node), initial cost is 0 for the starting node and tie_priority is 0
        visited = set() # set of nodes that have been visited, no repeat
        came_from = {} # dictionary of nodes that have been visited, key is the node, value is the parent node, kind of like linked list
        cost_so_far = {} # dictionary of nodes that have been visited, key is the node, value is the cost to get to that node from the start node
        batch_number = 0 # neighbor batch number, used to break tie

        came_from[start_node] = None # the parent of the starting node is None
        cost_so_far[start_node] = 0 # the cost to get to the starting node from the starting node is 0
        visited.add(start_node) # add the starting node to the visited set

        while pending:
            _, _, _, _, current_node = heapq.heappop(pending) # get the node with the lowest cost from the priority queue
            # print("poped node: ", current_node)
            visited.add(current_node) # add the node to the visited set
            if current_node == goal_node:
                break
            batch_number = batch_number + 1
            for next_node in self.get_neighbors(current_node): # get the neighbors of the current node
                new_cost = cost_so_far[current_node] + self.get_cost(current_node, next_node)# calculate the cost to get to the neighbor node from the start node
                if next_node not in visited or new_cost < cost_so_far.get(next_node, float('inf')): # if the neighbor node has not been visited or the cost to get to the neighbor node from the start node is less than the current cost to get to the neighbor node from the start node
                    cost_so_far[next_node] = new_cost# update the cost to get to the neighbor node from the start node
                    directional_priorities = 0
                    if next_node[0] < current_node[0]: # up
                        directional_priorities = 1
                    elif next_node[0] > current_node[0]: # down
                        directional_priorities = 2
                    elif next_node[1] < current_node[1]: # left
                        directional_priorities = 3
                    elif next_node[1] > current_node[1]: # right
                        directional_priorities = 4
                    if next_node not in visited and next_node not in [node for _, _, _, _, node in pending]:
                        heapq.heappush(pending, (cost_so_far[next_node], self.heuristic(next_node, goal_node), batch_number, directional_priorities, next_node)) # add the neighbor node to the priority queue
                        came_from[next_node] = current_node # set the parent of the neighbor node to the current node

        if goal_node not in visited:
            return None
        
        path = []
        current_node = goal_node
        while current_node != start_node:
            path.append(current_node)
            current_node = came_from[current_node]
        path.append(start_node)
        path.reverse()
        return path

    def print_path(self) -> None:
        """print the path on the map"""
        if self.path is None:
            print("null")
            return
        for node in self.path:
            print(node)
            self.map_array[node[0]][node[1]] = "*"
        for row in self.map_array:
            print(" ".join(row))

if __name__ == "__main__":
    # pass
    New_Path = Pathfinder("map2.txt","astar","manhattan")
    # print the costs from (5, 5) to left and up
    # print("left:", New_Path.get_cost((5, 5), (5, 4)), "hueristic:", New_Path.heuristic((5, 4)), "cost + hueristic:", New_Path.get_cost((5, 5), (5, 4)) + New_Path.heuristic((5, 4))) # directly left
    # print("up:", New_Path.get_cost((5, 5), (4, 5)), "hueristic:", New_Path.heuristic((4, 5)), "cost + hueristic:", New_Path.get_cost((5, 5), (4, 5)) + New_Path.heuristic((4, 5))) # directly up
    