package com.example.springstudents.controller;

import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;
import com.example.springstudents.model.Student;
import com.example.springstudents.service.StudentService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/students")
@AllArgsConstructor
public class StudentController {
    private final StudentService service;

    @GetMapping
    public List<Student> findAllStudent() {
        return service.findAllStudent();
    }

    @PostMapping("save_student")
    public String saveStudent(@RequestBody Student student) {
        service.saveStudent(student);
        return "Student successfully saved";
    }

    @GetMapping("/{email}")
    public Student findByEmail(@PathVariable String email) {
        return service.findByEmail(email);
    }

    @PutMapping("update_student")
    public Student updateStudent(@RequestBody Student student) {
        return service.updateStudent(student);
    }

    @DeleteMapping("delete_student/{email}")
    public void deleteStudent(@PathVariable String email) {
        service.deleteStudent(email);
    }
}