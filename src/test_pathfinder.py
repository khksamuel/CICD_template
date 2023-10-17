from pathfinder import Pathfinder

def test_pathfinder():
    #test1
    pathfinder = Pathfinder("src/map1.txt", "bfs","euclidean")
    expected_output = [(5, 5),(4, 5),(4, 4),(4, 3),(4, 2),(4, 1),(3, 1),(2, 1),(2, 0),(1, 0),(0, 0),(0, 1),(0, 2),(0, 3),(0, 4),(0, 5),(1, 5),(1, 6),(1, 7),(1, 8),(2, 8),(2, 9),(2, 10),(2, 11),(3, 11),(4, 11),(5, 11),(5, 10),(5, 9),(5, 8),(5, 7)]
    assert pathfinder.path == expected_output
    print("test 1 correct")

    #test2
    pathfinder = Pathfinder("src/map1.txt", "astar","euclidean")
    expected_output = [(5, 5),(5, 4),(4, 4),(4, 3),(4, 2),(4, 1),(4, 0),(3, 0),(2, 0),(1, 0),(0, 0),(0, 1),(0, 2),(0, 3),(0, 4),(0, 5),(0, 6),(0, 7),(0, 8),(0, 9),(0, 10),(0, 11),(1, 11),(2, 11),(3, 11),(4, 11),(4, 10),(5, 10),(5, 9),(5, 8),(5, 7)]
    assert pathfinder.path == expected_output
    print("test 2 correct")

    #test3 
    pathfinder = Pathfinder("src/map1.txt", "astar","manhattan")
    expected_output = [(5, 5),(5, 4),(4, 4),(4, 3),(4, 2),(4, 1),(4, 0),(3, 0),(2, 0),(1, 0),(0, 0),(0, 1),(0, 2),(0, 3),(0, 4),(0, 5),(0, 6),(0, 7),(0, 8),(0, 9),(0, 10),(0, 11),(1, 11),(2, 11),(3, 11),(4, 11),(5, 11),(5, 10),(5, 9),(5, 8),(5, 7)]
    assert pathfinder.path == expected_output
    print("test 3 correct")

    #test4
    pathfinder = Pathfinder("src/map2.txt", "bfs","manhattan")
    expected_output = [(0, 0),(1, 0),(2, 0),(3, 0),(4, 0),(5, 0),(6, 0),(7, 0),(8, 0),(8, 1),(9, 1),(9, 2),(9, 3),(9, 4),(9, 5),(9, 6),(9, 7),(9, 8),(9, 9)]
    assert pathfinder.path == expected_output
    print("test 4 correct")
    
    #test5
    pathfinder = Pathfinder("src/map2.txt", "ucs","manhattan")
    expected_output = [(0, 0),(1, 0),(2, 0),(3, 0),(4, 0),(5, 0),(5, 1),(6, 1),(6, 2),(7, 2),(8, 2),(8, 3),(9, 3),(9, 4),(9, 5),(9, 6),(9, 7),(9, 8),(9, 9)]
    assert pathfinder.path == expected_output
    print("test 5 correct")

    #test6
    pathfinder = Pathfinder("src/map2.txt", "astar","euclidean")
    expected_output = [(0, 0),(1, 0),(1, 1),(2, 1),(2, 2),(3, 2),(3, 3),(4, 3),(4, 4),(5, 4),(5, 5),(5, 6),(6, 6),(7, 6),(7, 7),(8, 7),(8, 8),(9, 8),(9, 9)]
    assert pathfinder.path == expected_output
    print("test 6 correct")

    #test7
    pathfinder = Pathfinder("src/map2.txt", "astar","manhattan")
    expected_output = [(0, 0),(1, 0),(2, 0),(3, 0),(4, 0),(5, 0),(5, 1),(6, 1),(6, 2),(7, 2),(8, 2),(8, 3),(9, 3),(9, 4),(9, 5),(9, 6),(9, 7),(9, 8),(9, 9)]
    assert pathfinder.path == expected_output
    print("test 7 correct")

    # #test8 purposelly incorrect
    # pathfinder = Pathfinder("src/map2.txt", "astar","euclidean")
    # expected_output = [(0, 0),(1, 0),(2, 0),(3, 0),(4, 0),(5, 0),(5, 1),(6, 1),(6, 2),(7, 2),(8, 2),(8, 3),(9, 3),(9, 4),(9, 5),(9, 6),(9, 7),(9, 8),(9, 9)]
    # assert pathfinder.path == expected_output
    # print("test 8 correct")
if __name__ == '__main__':
    test_pathfinder()