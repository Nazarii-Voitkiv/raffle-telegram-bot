package com.example.springstudents.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.springstudents.model.Student;


public interface StudentRepository extends JpaRepository<Student, Long> {
    void deleteByEmail(String email);
    Student findStudentByEmail(String email);
}